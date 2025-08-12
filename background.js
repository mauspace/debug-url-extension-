// background.js (Service Worker for MV3)
console.log("SERVICE WORKER (Toolkit Pro): Script started.");
const SFMC_WRAPPER_HOST="user-content.s4.sfmc-content.com";const SFMC_WRAPPER_PREFIX_PATH="/httpgetwrap|";const STORAGE_KEY_SFMC_UNWRAPPER_ENABLED='sfmcUnwrapperEnabled';let isSfmcUnwrapperEnabled=!0;async function loadInitialSfmcState(){try{const d=await chrome.storage.sync.get(STORAGE_KEY_SFMC_UNWRAPPER_ENABLED);isSfmcUnwrapperEnabled=void 0!==d[STORAGE_KEY_SFMC_UNWRAPPER_ENABLED]?d[STORAGE_KEY_SFMC_UNWRAPPER_ENABLED]:!0;void 0===d[STORAGE_KEY_SFMC_UNWRAPPER_ENABLED]&&await chrome.storage.sync.set({[STORAGE_KEY_SFMC_UNWRAPPER_ENABLED]:!0});console.log('SERVICE WORKER: SFMC Unwrapper state loaded. Enabled:',isSfmcUnwrapperEnabled)}catch(e){console.error('SERVICE WORKER: Error loading SFMC state:',e);isSfmcUnwrapperEnabled=!0}}chrome.storage.onChanged.addListener((c,n)=>{n==="sync"&&c[STORAGE_KEY_SFMC_UNWRAPPER_ENABLED]&&(isSfmcUnwrapperEnabled=c[STORAGE_KEY_SFMC_UNWRAPPER_ENABLED].newValue,console.log("SERVICE WORKER: SFMC Unwrapper state changed. Now:",isSfmcUnwrapperEnabled))});chrome.webRequest.onBeforeRequest.addListener(async function(d){if(!isSfmcUnwrapperEnabled||"GET"!==d.method||"main_frame"!==d.type||!d.url||!d.tabId||d.tabId<0)return;try{const t=new URL(d.url);if(t.hostname===SFMC_WRAPPER_HOST&&t.pathname.startsWith(SFMC_WRAPPER_PREFIX_PATH)){const e=t.pathname.substring(SFMC_WRAPPER_PREFIX_PATH.length);if(!e){console.warn(`SERVICE WORKER: Incomplete SFMC (no target): ${d.url}. Redirecting to about:blank.`);try{await chrome.tabs.update(d.tabId,{url:"about:blank"})}catch(d){console.error("SERVICE WORKER: Error redirecting to about:blank:",d)}return}const o=decodeURIComponent(e);if(o.startsWith("http://")||o.startsWith("https://"))try{new URL(o),console.log(`SERVICE WORKER: SFMC redirecting tab ${d.tabId} from ${d.url} to ${o}`),await chrome.tabs.update(d.tabId,{url:o})}catch(t){console.warn(`SERVICE WORKER: SFMC - Invalid extracted URL "${o}". Error: ${t.message}`)}else console.warn(`SERVICE WORKER: SFMC - Extracted part "${o}" not HTTP(S).`)}}catch(d){console.error(`SERVICE WORKER: SFMC - Error processing URL "${d.url}": ${d.message}`)}},{urls:[`*://${SFMC_WRAPPER_HOST}${SFMC_WRAPPER_PREFIX_PATH}*`],types:["main_frame"]});
const OVERLAY_STORAGE_IMAGE_KEY='toolkitOverlayImage';const OVERLAY_STORAGE_SETTINGS_KEY='toolkitOverlaySettings';
chrome.runtime.onMessage.addListener((request,sender,sendResponse)=>{
    if(request.source==='toolkit-content-script'&&request.action==='getInitialOverlayState'){
        (async()=>{ try{const r=await chrome.storage.local.get([OVERLAY_STORAGE_IMAGE_KEY,OVERLAY_STORAGE_SETTINGS_KEY]);if(r[OVERLAY_STORAGE_IMAGE_KEY]&&r[OVERLAY_STORAGE_SETTINGS_KEY]){sendResponse({hasState:!0,imageData:r[OVERLAY_STORAGE_IMAGE_KEY],settings:r[OVERLAY_STORAGE_SETTINGS_KEY]});}else{sendResponse({hasState:!1});}}catch(e){console.error("BG: Error getting overlay state for content script:",e);sendResponse({hasState:!1,error:e.message});}})();
        return true;
    }
    if(request.source && request.source.startsWith('toolkit-popup') && sender.tab===undefined){
        (async()=>{
            try{
                const[activeTab]=await chrome.tabs.query({active:true,currentWindow:true});
                if(activeTab&&activeTab.id&&activeTab.url&&(activeTab.url.startsWith('http:')||activeTab.url.startsWith('https:'))){
                    try{
                        await chrome.scripting.executeScript({target:{tabId:activeTab.id},files:['content_script.js']}); // <-- UPDATED FILENAME
                    }catch(injectionError){console.warn("BG: content_script.js injection attempt info:",injectionError.message);}
                    const responseFromContent=await chrome.tabs.sendMessage(activeTab.id,request);
                    sendResponse(responseFromContent);
                }else{sendResponse({error:"No active HTTP/S tab found for this tool."});}
            }catch(e){console.error("BG: Error handling message to content script:",e);sendResponse({error:"Background error: "+e.message});}
        })();
        return true;
    }
});
(async()=>{await loadInitialSfmcState();console.log("SERVICE WORKER (Toolkit Pro): Initial states processed.");})();
chrome.runtime.onInstalled.addListener(async(details)=>{if(details.reason==="install"){console.log("SERVICE WORKER (Toolkit Pro): Extension first install.");await loadInitialSfmcState();await chrome.storage.local.remove([OVERLAY_STORAGE_IMAGE_KEY,OVERLAY_STORAGE_SETTINGS_KEY]);console.log("SERVICE WORKER (Toolkit Pro): Overlay storage cleared on install.");}});