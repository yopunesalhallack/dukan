// public/js/speech.js

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;

if (SpeechRecognition) {
  recognition = new SpeechRecognition();
  recognition.lang = 'ar-SA';   
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
}

/**
 * @returns {Promise<string>}     
 */
function startListening() {
  return new Promise((resolve, reject) => {
    if (!recognition) {
      reject(new Error('متصفحك لا يدعم التعرف على الصوت. استخدم Chrome أو Edge.'));
      return;
    }
    recognition.start();
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript.trim();
      resolve(transcript);
    };
    recognition.onerror = (event) => {
      reject(new Error(`خطأ في التعرف على الصوت: ${event.error}`));
    };
  });
}

/**
 *    
 * @param {string} text   
 * @param {string} lang    
 */
function speak(text, lang = 'ar-SA') {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  }
}

/**
  @param {string} selectElementId 
 */
async function voiceSearchProduct(selectElementId) {
  try {
    speak('تحدث باسم المنتج أو الباركود');
    const spokenText = await startListening();
    console.log('تم التعرف على:', spokenText);
    
    const select = document.getElementById(selectElementId);
    if (!select) throw new Error('القائمة غير موجودة');
    
    const options = select.options;
    let foundOption = null;
    
    
    for (let i = 1; i < options.length; i++) {
      const optionText = options[i].textContent;
      const barcode = options[i].dataset.barcode;
      
      // check if the product is exist
      if (optionText.includes(spokenText) || (barcode && barcode.includes(spokenText))) {
        foundOption = options[i];
        break;
      }
    }
    
    if (foundOption) {
      select.value = foundOption.value;
      const productName = foundOption.textContent.split(' (')[0]; 
      speak(`تم اختيار ${productName}`);
      return foundOption;
    } else {
      speak(`لم يتم العثور على ${spokenText}، حاول مرة أخرى`);
      return null;
    }
  } catch (error) {
    console.error(error);
    speak('عذراً، حدث خطأ في التعرف على الصوت');
    throw error;
  }
}