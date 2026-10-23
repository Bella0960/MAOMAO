/* MAOMAO · shared wallpaper persistence
   IndexedDB avoids localStorage quota failures for large wallpaper data URLs.
   Falls back to the legacy localStorage key for older browsers and existing saved wallpapers. */
(function (window, document) {
  'use strict';

  var DB_NAME = 'maomao-media-store';
  var DB_VERSION = 1;
  var STORE_NAME = 'wallpapers';
  var WALLPAPER_KEY = 'home_custom_wallpaper';
  var dbPromise = null;

  function openDB() {
    if (!('indexedDB' in window)) return Promise.reject(new Error('IndexedDB is unavailable'));
    if (dbPromise) return dbPromise;
    dbPromise = new Promise(function (resolve, reject) {
      var request;
      try {
        request = window.indexedDB.open(DB_NAME, DB_VERSION);
      } catch (error) {
        reject(error);
        return;
      }
      request.onupgradeneeded = function () {
        var db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
      };
      request.onsuccess = function () { resolve(request.result); };
      request.onerror = function () { reject(request.error || new Error('Could not open wallpaper storage')); };
      request.onblocked = function () { reject(new Error('Wallpaper storage is blocked')); };
    }).catch(function (error) {
      dbPromise = null;
      throw error;
    });
    return dbPromise;
  }

  function readDB() {
    return openDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE_NAME, 'readonly');
        var request = tx.objectStore(STORE_NAME).get(WALLPAPER_KEY);
        request.onsuccess = function () {
          var value = request.result;
          resolve(typeof value === 'string' ? value : (value && value.dataUrl) || '');
        };
        request.onerror = function () { reject(request.error || new Error('Could not read wallpaper')); };
        tx.onabort = function () { reject(tx.error || new Error('Wallpaper read was aborted')); };
      });
    });
  }

  function writeDB(dataUrl) {
    return openDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put({
          dataUrl: dataUrl,
          updatedAt: Date.now()
        }, WALLPAPER_KEY);
        tx.oncomplete = function () {
          try { window.localStorage.removeItem(WALLPAPER_KEY); } catch (error) {}
          resolve(true);
        };
        tx.onerror = function () { reject(tx.error || new Error('Could not save wallpaper')); };
        tx.onabort = function () { reject(tx.error || new Error('Wallpaper save was aborted')); };
      });
    });
  }

  function readLegacy() {
    try { return window.localStorage.getItem(WALLPAPER_KEY) || ''; }
    catch (error) { return ''; }
  }

  function getWallpaper() {
    return readDB().then(function (value) {
      if (value) return value;
      var legacy = readLegacy();
      if (!legacy) return '';
      /* Migrate older localStorage-based wallpaper asynchronously; do not block display. */
      writeDB(legacy).catch(function () {});
      return legacy;
    }).catch(function () {
      return readLegacy();
    });
  }

  function saveWallpaper(dataUrl) {
    if (typeof dataUrl !== 'string' || !/^data:image\//i.test(dataUrl)) {
      return Promise.reject(new Error('Invalid wallpaper image'));
    }
    return writeDB(dataUrl).catch(function () {
      /* Fallback for browsers that disable IndexedDB; use a compressed image if quota allows. */
      try {
        window.localStorage.setItem(WALLPAPER_KEY, dataUrl);
        return true;
      } catch (error) {
        throw new Error('本机存储空间不足，无法保存壁纸');
      }
    });
  }

  function clearWallpaper() {
    var legacyRemoved = false;
    try {
      window.localStorage.removeItem(WALLPAPER_KEY);
      legacyRemoved = true;
    } catch (error) {}
    return openDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).delete(WALLPAPER_KEY);
        tx.oncomplete = function () { resolve(true); };
        tx.onerror = function () { reject(tx.error || new Error('Could not clear wallpaper')); };
        tx.onabort = function () { reject(tx.error || new Error('Wallpaper clear was aborted')); };
      });
    }).catch(function () {
      if (legacyRemoved) return true;
      throw new Error('无法清除已保存的壁纸');
    });
  }

  window.MAOMAOWallpaperStore = {
    get: getWallpaper,
    save: saveWallpaper,
    clear: clearWallpaper,
    key: WALLPAPER_KEY
  };
})(window, document);