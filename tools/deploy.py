"""رفع فولدر على GitHub في commit واحد (من غير git) باستخدام gh CLI.

python tools/deploy.py OWNER/REPO LOCAL_DIR "رسالة الـ commit" [--only path1,path2]
- بيتجاهل .claude و .git و tools/__pycache__
- لو الريبو فاضي بيعمل أول commit بالـ README الأول
"""
import base64, json, os, subprocess, sys

repo, root, msg = sys.argv[1], sys.argv[2], sys.argv[3]
only = None
if '--only' in sys.argv:
    only = set(sys.argv[sys.argv.index('--only') + 1].split(','))
SKIP = ('.claude', '.git', '__pycache__')


def gh(method, path, body=None, ok404=False):
    args = ['gh', 'api', '-X', method, path]
    if body is not None:
        args += ['--input', '-']
    r = subprocess.run(args, input=json.dumps(body).encode() if body is not None else None, capture_output=True)
    if r.returncode != 0:
        if ok404 and (b'404' in r.stdout or b'409' in r.stdout or b'Not Found' in r.stdout or b'empty' in r.stdout.lower()):
            return None
        raise SystemExit('gh api failed: ' + path + '\n' + r.stdout.decode('utf-8', 'replace') + r.stderr.decode('utf-8', 'replace'))
    return json.loads(r.stdout or b'null')


files = []
for dp, dn, fn in os.walk(root):
    dn[:] = [d for d in dn if d not in SKIP]
    for f in fn:
        full = os.path.join(dp, f)
        rel = os.path.relpath(full, root).replace(os.sep, '/')
        if only is None or rel in only:
            files.append((rel, full))

ref = gh('GET', f'repos/{repo}/git/ref/heads/main', ok404=True)
if ref is None:  # ريبو فاضي: أول commit
    first = files[0]
    with open(first[1], 'rb') as fh:
        gh('PUT', f'repos/{repo}/contents/{first[0]}', {'message': 'init', 'content': base64.b64encode(fh.read()).decode()})
    ref = gh('GET', f'repos/{repo}/git/ref/heads/main')
head = ref['object']['sha']
base_tree = gh('GET', f'repos/{repo}/git/commits/{head}')['tree']['sha']

tree = []
for rel, full in files:
    with open(full, 'rb') as fh:
        blob = gh('POST', f'repos/{repo}/git/blobs', {'content': base64.b64encode(fh.read()).decode(), 'encoding': 'base64'})
    tree.append({'path': rel, 'mode': '100644', 'type': 'blob', 'sha': blob['sha']})
    print('  +', rel)
t = gh('POST', f'repos/{repo}/git/trees', {'base_tree': base_tree, 'tree': tree})
c = gh('POST', f'repos/{repo}/git/commits', {'message': msg, 'tree': t['sha'], 'parents': [head]})
gh('PATCH', f'repos/{repo}/git/refs/heads/main', {'sha': c['sha']})
print('committed', c['sha'][:7], len(tree), 'files')
