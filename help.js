'use strict';
const guides = {
  'en-IN': {
    ui:['Installation and notifications','Language','Phone','Read aloud','Stop','Test notifications','Send test notification'],
    android:'Open this website in Chrome. Tap Install Trip Friend, or use Chrome’s menu and choose Install app or Add to Home screen. Open the app from its icon.',
    poco:'On POCO, Xiaomi or Redmi, search Settings for App notifications. Check Trip Friend or Chrome, whichever appears. If alerts arrive late, check the app’s battery settings. Menu names vary by HyperOS and MIUI version.',
    vivo:'On Vivo or iQOO, search Settings for App notifications and allow alerts for Trip Friend or Chrome. If alerts arrive late, check background activity in Battery settings. Menu names vary by Funtouch OS version.',
    iphone:'Open the site in Safari. Tap Share, then Add to Home Screen. Open Trip Friend from its icon and tap Send test notification.',
    fix:'If the test is blocked, allow notifications for this site in browser settings and for Trip Friend or your browser in phone settings. Check Do Not Disturb if the alert is silent.',
    privacy:'Allow notifications to receive alerts. Allow location or microphone access only when you use those features. This local test contains no trip details and does not check closed-app push delivery.',
    status:['Check the notification shade for the Trip Friend test alert. If it is missing, follow the steps on this page.','Notifications are blocked. Follow the permission steps on this page, then try again.','This browser cannot run the test. Open Trip Friend over HTTPS in a supported browser or from its Home Screen icon.','The test could not start. Check permissions, reopen Trip Friend, and try again.','Test notification','Your Trip Friend notification test.','No matching voice is available. Check your phone’s text-to-speech languages.']
  },
  'te-IN': {
    ui:['ఇన్‌స్టాలేషన్ మరియు నోటిఫికేషన్‌లు','భాష','ఫోన్','చదివి వినిపించు','ఆపు','నోటిఫికేషన్‌ల పరీక్ష','పరీక్ష నోటిఫికేషన్ పంపండి'],
    android:'ఈ వెబ్‌సైట్‌ను క్రోమ్‌లో తెరవండి. Install Trip Friend నొక్కండి లేదా క్రోమ్ మెనూలో Install app లేదా Add to Home screen ఎంచుకోండి. ఆపై హోమ్ స్క్రీన్‌లోని ఐకాన్ నుంచి యాప్ తెరవండి.',
    poco:'పోకో, షావోమీ లేదా రెడ్‌మీ ఫోన్ సెట్టింగ్‌లలో App notifications కోసం వెతకండి. Trip Friend లేదా Chrome కనిపిస్తే నోటిఫికేషన్‌లు అనుమతించండి. ఆలస్యంగా వస్తే బ్యాటరీ సెట్టింగ్‌లను చూడండి. సాఫ్ట్‌వేర్ వెర్షన్ బట్టి మెనూలు మారవచ్చు.',
    vivo:'వివో లేదా ఐకూ ఫోన్ సెట్టింగ్‌లలో App notifications కోసం వెతికి Trip Friend లేదా Chrome కోసం అనుమతించండి. ఆలస్యమైతే బ్యాటరీ సెట్టింగ్‌లలో బ్యాక్‌గ్రౌండ్ యాక్టివిటీని చూడండి. మెనూలు మారవచ్చు.',
    iphone:'సఫారీలో వెబ్‌సైట్ తెరవండి. Share నొక్కి Add to Home Screen ఎంచుకోండి. ఐకాన్ నుంచి Trip Friend తెరిచి పరీక్ష నోటిఫికేషన్ పంపండి.',
    fix:'పరీక్ష పనిచేయకపోతే బ్రౌజర్‌లో ఈ సైట్‌కు, ఫోన్ సెట్టింగ్‌లలో Trip Friend లేదా బ్రౌజర్‌కు నోటిఫికేషన్‌లు అనుమతించండి. శబ్దం రాకపోతే Do Not Disturb చూడండి.',
    privacy:'అలర్ట్‌ల కోసం నోటిఫికేషన్‌లను అనుమతించండి. అవసరమైనప్పుడు మాత్రమే లొకేషన్ లేదా మైక్రోఫోన్ అనుమతించండి. ఈ పరీక్షలో ట్రిప్ వివరాలు ఉండవు. యాప్ మూసినప్పుడు వచ్చే పుష్ నోటిఫికేషన్‌లకు ఇది పరీక్ష కాదు.',
    status:['పరీక్ష నోటిఫికేషన్ కోసం ఫోన్ నోటిఫికేషన్‌లను చూడండి. కనిపించకపోతే ఈ పేజీలోని సూచనలు పాటించండి.','నోటిఫికేషన్‌లు బ్లాక్ అయ్యాయి. అనుమతులు మార్చి మళ్లీ ప్రయత్నించండి.','ఈ బ్రౌజర్‌లో పరీక్ష అందుబాటులో లేదు. HTTPS ద్వారా మద్దతు ఉన్న బ్రౌజర్‌లో లేదా హోమ్ స్క్రీన్ ఐకాన్ నుంచి తెరవండి.','పరీక్ష మొదలవలేదు. అనుమతులు చూసి యాప్ మళ్లీ తెరవండి.','పరీక్ష నోటిఫికేషన్','ఇది Trip Friend నోటిఫికేషన్ పరీక్ష.','ఈ భాషకు వాయిస్ అందుబాటులో లేదు. ఫోన్‌లో టెక్స్ట్ టు స్పీచ్ భాషలను చూడండి.']
  },
  'kn-IN': {
    ui:['ಸ್ಥಾಪನೆ ಮತ್ತು ಅಧಿಸೂಚನೆಗಳು','ಭಾಷೆ','ಫೋನ್','ಓದಿ ಕೇಳಿಸಿ','ನಿಲ್ಲಿಸಿ','ಅಧಿಸೂಚನೆ ಪರೀಕ್ಷೆ','ಪರೀಕ್ಷಾ ಅಧಿಸೂಚನೆ ಕಳುಹಿಸಿ'],
    android:'ಈ ವೆಬ್‌ಸೈಟ್ ಅನ್ನು ಕ್ರೋಮ್‌ನಲ್ಲಿ ತೆರೆಯಿರಿ. Install Trip Friend ಒತ್ತಿ ಅಥವಾ ಕ್ರೋಮ್ ಮೆನುವಿನಲ್ಲಿ Install app ಅಥವಾ Add to Home screen ಆಯ್ಕೆಮಾಡಿ. ನಂತರ ಐಕಾನ್‌ನಿಂದ ಆ್ಯಪ್ ತೆರೆಯಿರಿ.',
    poco:'ಪೋಕೋ, ಶಿಯೋಮಿ ಅಥವಾ ರೆಡ್ಮಿ ಫೋನ್‌ನ ಸೆಟ್ಟಿಂಗ್‌ಗಳಲ್ಲಿ App notifications ಹುಡುಕಿ. Trip Friend ಅಥವಾ Chrome ಗೆ ಅಧಿಸೂಚನೆ ಅನುಮತಿಸಿ. ತಡವಾದರೆ ಬ್ಯಾಟರಿ ಸೆಟ್ಟಿಂಗ್‌ಗಳನ್ನು ಪರಿಶೀಲಿಸಿ. ಆವೃತ್ತಿಯ ಪ್ರಕಾರ ಮೆನು ಬದಲಾಗಬಹುದು.',
    vivo:'ವಿವೋ ಅಥವಾ ಐಕೂ ಫೋನ್‌ನ ಸೆಟ್ಟಿಂಗ್‌ಗಳಲ್ಲಿ App notifications ಹುಡುಕಿ ಮತ್ತು Trip Friend ಅಥವಾ Chrome ಗೆ ಅನುಮತಿಸಿ. ತಡವಾದರೆ ಬ್ಯಾಟರಿ ಸೆಟ್ಟಿಂಗ್‌ಗಳಲ್ಲಿ ಹಿನ್ನೆಲೆ ಚಟುವಟಿಕೆ ಪರಿಶೀಲಿಸಿ. ಮೆನು ಬದಲಾಗಬಹುದು.',
    iphone:'ಸಫಾರಿಯಲ್ಲಿ ಸೈಟ್ ತೆರೆಯಿರಿ. Share ಒತ್ತಿ Add to Home Screen ಆಯ್ಕೆಮಾಡಿ. ಐಕಾನ್‌ನಿಂದ Trip Friend ತೆರೆದು ಪರೀಕ್ಷಾ ಅಧಿಸೂಚನೆ ಕಳುಹಿಸಿ.',
    fix:'ಪರೀಕ್ಷೆ ವಿಫಲವಾದರೆ ಬ್ರೌಸರ್‌ನಲ್ಲಿ ಈ ಸೈಟ್‌ಗೆ ಮತ್ತು ಫೋನ್ ಸೆಟ್ಟಿಂಗ್‌ಗಳಲ್ಲಿ Trip Friend ಅಥವಾ ಬ್ರೌಸರ್‌ಗೆ ಅಧಿಸೂಚನೆ ಅನುಮತಿಸಿ. ಧ್ವನಿ ಬರದಿದ್ದರೆ Do Not Disturb ಪರಿಶೀಲಿಸಿ.',
    privacy:'ಅಲರ್ಟ್‌ಗಳಿಗೆ ಅಧಿಸೂಚನೆ ಅನುಮತಿಸಿ. ಬಳಸುವಾಗ ಮಾತ್ರ ಸ್ಥಳ ಅಥವಾ ಮೈಕ್ರೊಫೋನ್ ಅನುಮತಿಸಿ. ಈ ಪರೀಕ್ಷೆಯಲ್ಲಿ ಪ್ರವಾಸದ ವಿವರಗಳಿಲ್ಲ. ಆ್ಯಪ್ ಮುಚ್ಚಿದಾಗ ಬರುವ ಪುಶ್ ಅಧಿಸೂಚನೆಗಳಿಗೆ ಇದು ಪರೀಕ್ಷೆಯಲ್ಲ.',
    status:['ಫೋನ್‌ನ ಅಧಿಸೂಚನೆಗಳಲ್ಲಿ ಪರೀಕ್ಷಾ ಸಂದೇಶ ನೋಡಿ. ಕಾಣದಿದ್ದರೆ ಈ ಪುಟದ ಸೂಚನೆಗಳನ್ನು ಅನುಸರಿಸಿ.','ಅಧಿಸೂಚನೆಗಳನ್ನು ನಿರ್ಬಂಧಿಸಲಾಗಿದೆ. ಅನುಮತಿಗಳನ್ನು ಬದಲಿಸಿ ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.','ಈ ಬ್ರೌಸರ್ ಪರೀಕ್ಷೆಯನ್ನು ಬೆಂಬಲಿಸುವುದಿಲ್ಲ. ಬೆಂಬಲಿತ ಬ್ರೌಸರ್‌ನಲ್ಲಿ HTTPS ಮೂಲಕ ಅಥವಾ ಹೋಮ್ ಸ್ಕ್ರೀನ್ ಐಕಾನ್‌ನಿಂದ ತೆರೆಯಿರಿ.','ಪರೀಕ್ಷೆ ಆರಂಭವಾಗಲಿಲ್ಲ. ಅನುಮತಿಗಳನ್ನು ಪರಿಶೀಲಿಸಿ ಮತ್ತೆ ತೆರೆಯಿರಿ.','ಪರೀಕ್ಷಾ ಅಧಿಸೂಚನೆ','ಇದು Trip Friend ಅಧಿಸೂಚನೆ ಪರೀಕ್ಷೆ.','ಈ ಭಾಷೆಯ ಧ್ವನಿ ಲಭ್ಯವಿಲ್ಲ. ಫೋನ್‌ನ ಪಠ್ಯದಿಂದ ಧ್ವನಿ ಭಾಷೆಗಳನ್ನು ಪರಿಶೀಲಿಸಿ.']
  },
  'ta-IN': {
    ui:['நிறுவலும் அறிவிப்புகளும்','மொழி','தொலைபேசி','வாசித்துக் காட்டு','நிறுத்து','அறிவிப்புகளைச் சோதிக்கவும்','சோதனை அறிவிப்பை அனுப்பவும்'],
    android:'இந்த இணையதளத்தை குரோமில் திறக்கவும். Install Trip Friend என்பதைத் தட்டவும் அல்லது குரோம் மெனுவில் Install app அல்லது Add to Home screen என்பதைத் தேர்ந்தெடுக்கவும். பின்னர் முகப்புத் திரை ஐகானிலிருந்து திறக்கவும்.',
    poco:'போகோ, ஷாவ்மி அல்லது ரெட்மி அமைப்புகளில் App notifications என்பதைத் தேடவும். Trip Friend அல்லது Chrome அறிவிப்புகளை அனுமதிக்கவும். தாமதமானால் பேட்டரி அமைப்புகளைச் சரிபார்க்கவும். பதிப்பைப் பொறுத்து மெனு மாறலாம்.',
    vivo:'விவோ அல்லது ஐகூ அமைப்புகளில் App notifications என்பதைத் தேடி Trip Friend அல்லது Chrome அறிவிப்புகளை அனுமதிக்கவும். தாமதமானால் பேட்டரி அமைப்புகளில் பின்னணி செயல்பாட்டைச் சரிபார்க்கவும். மெனு மாறலாம்.',
    iphone:'சஃபாரியில் தளத்தைத் திறக்கவும். Share என்பதைத் தட்டி Add to Home Screen என்பதைத் தேர்ந்தெடுக்கவும். ஐகானிலிருந்து Trip Friend திறந்து சோதனை அறிவிப்பை அனுப்பவும்.',
    fix:'சோதனை தடுக்கப்பட்டால் உலாவியில் இந்தத் தளத்திற்கும், தொலைபேசி அமைப்புகளில் Trip Friend அல்லது உலாவிக்கும் அறிவிப்புகளை அனுமதிக்கவும். ஒலி வராவிட்டால் Do Not Disturb அமைப்பைப் பார்க்கவும்.',
    privacy:'எச்சரிக்கைகளுக்கு அறிவிப்புகளை அனுமதிக்கவும். பயன்படுத்தும்போது மட்டும் இருப்பிடம் அல்லது மைக்ரோஃபோனை அனுமதிக்கவும். இதில் பயண விவரங்கள் இல்லை. செயலி மூடப்பட்டிருக்கும்போது வரும் புஷ் அறிவிப்புகளுக்கான சோதனை இது அல்ல.',
    status:['தொலைபேசியின் அறிவிப்புப் பகுதியில் சோதனை அறிவிப்பைப் பார்க்கவும். தெரியாவிட்டால் இந்தப் பக்கத்தின் வழிமுறைகளைப் பின்பற்றவும்.','அறிவிப்புகள் தடுக்கப்பட்டுள்ளன. அனுமதிகளை மாற்றி மீண்டும் முயலவும்.','இந்த உலாவியில் சோதனை இயங்காது. ஆதரிக்கப்படும் உலாவியில் HTTPS வழியாக அல்லது முகப்புத் திரை ஐகானிலிருந்து திறக்கவும்.','சோதனையைத் தொடங்க முடியவில்லை. அனுமதிகளைச் சரிபார்த்து மீண்டும் திறக்கவும்.','சோதனை அறிவிப்பு','இது Trip Friend அறிவிப்புச் சோதனை.','இந்த மொழிக்கான குரல் கிடைக்கவில்லை. தொலைபேசியின் உரை வாசிப்பு மொழிகளைச் சரிபார்க்கவும்.']
  }
};
const byId = id => document.getElementById(id);
const language = byId('language');
const device = byId('device');
const speech = window.speechSynthesis;
const copy = () => guides[language.value];
function instructions() {
  const guide = copy();
  return [device.value === 'iphone' ? guide.iphone : guide.android, ...(['poco','vivo'].includes(device.value) ? [guide[device.value]] : []), guide.fix];
}
try {
  const preference = localStorage.getItem('trip-friend-help-language');
  if (Object.hasOwn(guides, preference)) language.value = preference;
} catch {}
function renderHelp() {
  speech?.cancel();
  document.documentElement.lang = language.value;
  ['help-title','language-label','device-label','speak','stop','test-title','test'].forEach((id,index) => { byId(id).textContent = copy().ui[index]; });
  byId('guide').replaceChildren(...instructions().map(text => {
    const paragraph = document.createElement('p');
    paragraph.textContent = text;
    return paragraph;
  }));
  byId('privacy').textContent = copy().privacy;
  byId('speech-status').textContent = '';
  byId('test-status').textContent = '';
}
language.addEventListener('change', () => {
  try { localStorage.setItem('trip-friend-help-language', language.value); } catch {}
  renderHelp();
});
device.addEventListener('change', renderHelp);
byId('speak').addEventListener('click', () => {
  const fail = () => { byId('speech-status').textContent = copy().status[6]; };
  if (!speech || !window.SpeechSynthesisUtterance) return fail();
  speech.cancel();
  const utterance = new SpeechSynthesisUtterance([...instructions(),copy().privacy].join(' '));
  utterance.lang = language.value;
  const voices = speech.getVoices().filter(voice => voice.localService);
  const voice = voices.find(voice => voice.lang.toLowerCase() === language.value.toLowerCase()) ||
    voices.find(voice => voice.lang.split('-')[0] === language.value.split('-')[0]);
  if (!voice) return fail();
  utterance.voice = voice;
  utterance.onerror = event => { if (!['canceled','interrupted'].includes(event.error)) fail(); };
  byId('speech-status').textContent = '';
  speech.speak(utterance);
});
byId('stop').addEventListener('click', () => speech?.cancel());
byId('test').addEventListener('click', async () => {
  const text = copy().status;
  const status = byId('test-status');
  const test = byId('test');
  if (!window.isSecureContext || !('Notification' in window) || !('serviceWorker' in navigator)) {
    status.textContent = text[2];
    return;
  }
  test.disabled = true;
  try {
    const permission = Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission;
    if (permission !== 'granted') { status.textContent = text[1]; return; }
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration?.active) { status.textContent = text[3]; return; }
    await registration.showNotification(text[4], {body:text[5],icon:'./icon-192.png',tag:'trip-friend-test',lang:language.value});
    status.textContent = text[0];
  } catch { status.textContent = text[3]; }
  finally { test.disabled = false; }
});
renderHelp();
