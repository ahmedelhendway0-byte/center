// عربي / English — زي المشروع القديم. tr('عربي','English')
const I18N = { lang: 'ar' };
try { I18N.lang = localStorage.getItem('center_lang') || 'ar'; } catch (e) { }
function tr(ar, en) { return I18N.lang === 'en' && en !== undefined ? en : ar; }
I18N.apply = () => { const d = document.documentElement; d.lang = I18N.lang; d.dir = I18N.lang === 'ar' ? 'rtl' : 'ltr'; };
I18N.toggle = () => { I18N.lang = I18N.lang === 'ar' ? 'en' : 'ar'; try { localStorage.setItem('center_lang', I18N.lang); } catch (e) { } I18N.apply(); };
I18N.apply();
