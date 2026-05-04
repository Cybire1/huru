(function (global) {
  "use strict";

  var DEFAULT_BASE_URL = "https://huruai.xyz";
  var POPUP_WIDTH = 500;
  var POPUP_HEIGHT = 600;
  var STORAGE_PREFIX = "huru_ct_";

  function hashSimple(str) {
    var hash = 0;
    for (var i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
    }
    return Math.abs(hash).toString(36);
  }

  function storageKey(apiKey) {
    return STORAGE_PREFIX + hashSimple(apiKey);
  }

  function getStoredToken(apiKey) {
    try {
      return localStorage.getItem(storageKey(apiKey));
    } catch (e) {
      return null;
    }
  }

  function setStoredToken(apiKey, token) {
    try {
      localStorage.setItem(storageKey(apiKey), token);
    } catch (e) {
      // storage unavailable
    }
  }

  function removeStoredToken(apiKey) {
    try {
      localStorage.removeItem(storageKey(apiKey));
    } catch (e) {
      // storage unavailable
    }
  }

  function HuruClient(opts) {
    if (!opts || !opts.apiKey) {
      throw new Error("Huru.init() requires an apiKey.");
    }
    this._apiKey = opts.apiKey;
    this._baseUrl = (opts.baseUrl || DEFAULT_BASE_URL).replace(/\/$/, "");
    this._token = getStoredToken(this._apiKey);
  }

  HuruClient.prototype.signIn = function () {
    var self = this;
    return new Promise(function (resolve, reject) {
      var origin = window.location.origin;
      var url =
        self._baseUrl +
        "/auth/consumer?apiKey=" +
        encodeURIComponent(self._apiKey) +
        "&origin=" +
        encodeURIComponent(origin);

      var left = Math.round(
        (screen.width - POPUP_WIDTH) / 2
      );
      var top = Math.round(
        (screen.height - POPUP_HEIGHT) / 2
      );
      var popup = window.open(
        url,
        "huru_signin",
        "width=" +
          POPUP_WIDTH +
          ",height=" +
          POPUP_HEIGHT +
          ",left=" +
          left +
          ",top=" +
          top +
          ",toolbar=no,menubar=no,scrollbars=yes"
      );

      if (!popup) {
        reject(new Error("Popup blocked. Please allow popups for this site."));
        return;
      }

      var resolved = false;
      var pollTimer = null;

      function onMessage(event) {
        if (event.origin !== self._baseUrl) return;
        var data = event.data;
        if (!data || typeof data !== "object") return;

        if (data.type === "huru:auth:success" && data.token) {
          resolved = true;
          cleanup();
          self._token = data.token;
          setStoredToken(self._apiKey, data.token);
          resolve({ token: data.token });
        } else if (data.type === "huru:auth:error") {
          resolved = true;
          cleanup();
          reject(new Error(data.error || "Authentication failed."));
        }
      }

      function cleanup() {
        window.removeEventListener("message", onMessage);
        if (pollTimer) clearInterval(pollTimer);
      }

      window.addEventListener("message", onMessage);

      // Poll for popup close (user cancelled)
      pollTimer = setInterval(function () {
        if (popup.closed && !resolved) {
          resolved = true;
          cleanup();
          reject(new Error("Sign-in cancelled."));
        }
      }, 500);
    });
  };

  HuruClient.prototype.signOut = function () {
    this._token = null;
    removeStoredToken(this._apiKey);
  };

  HuruClient.prototype.getConsumer = function () {
    return this._request("GET", "/v1/auth/me");
  };

  HuruClient.prototype.chat = function (body) {
    return this._request("POST", "/v1/chat/completions", body);
  };

  HuruClient.prototype.transcribe = function (file, model) {
    var formData = new FormData();
    formData.append("file", file);
    formData.append("model", model || "huru/stt-1");
    return this._request("POST", "/v1/audio/transcriptions", formData, true);
  };

  HuruClient.prototype.generateImage = function (body) {
    return this._request("POST", "/v1/images/generations", body);
  };

  HuruClient.prototype.topUp = function (packId) {
    var self = this;
    return new Promise(function (resolve, reject) {
      if (!self._token) {
        reject(new Error("Not signed in. Call signIn() first."));
        return;
      }

      // Open Paystack-based checkout in a new window
      var url =
        self._baseUrl +
        "/v1/consumers/checkout?pack=" +
        encodeURIComponent(packId || "credits_10") +
        "&token=" +
        encodeURIComponent(self._token) +
        "&apiKey=" +
        encodeURIComponent(self._apiKey);

      var popup = window.open(url, "huru_topup", "width=500,height=650");
      if (!popup) {
        reject(new Error("Popup blocked."));
        return;
      }

      // Resolve when popup closes
      var timer = setInterval(function () {
        if (popup.closed) {
          clearInterval(timer);
          resolve({ closed: true });
        }
      }, 500);
    });
  };

  HuruClient.prototype._request = function (method, path, body, isFormData) {
    var self = this;
    var headers = {
      "X-Huru-Api-Key": self._apiKey,
    };

    if (self._token) {
      headers["Authorization"] = "Bearer " + self._token;
    }

    var fetchOpts = {
      method: method,
      headers: headers,
    };

    if (body && method !== "GET") {
      if (isFormData) {
        fetchOpts.body = body;
      } else {
        headers["Content-Type"] = "application/json";
        fetchOpts.body = JSON.stringify(body);
      }
    }

    return fetch(self._baseUrl + path, fetchOpts).then(function (res) {
      if (res.status === 401) {
        // Token expired or invalid — clear stored token
        self._token = null;
        removeStoredToken(self._apiKey);
        return Promise.reject(
          new Error("Unauthorized. Please sign in again.")
        );
      }
      return res.json().then(function (data) {
        if (!res.ok) {
          var msg =
            (data.error && data.error.message) || "Request failed.";
          var err = new Error(msg);
          err.status = res.status;
          err.body = data;
          return Promise.reject(err);
        }
        return data;
      });
    });
  };

  var Huru = {
    init: function (opts) {
      return new HuruClient(opts);
    },
  };

  // Export for various module systems
  if (typeof module !== "undefined" && module.exports) {
    module.exports = Huru;
  } else if (typeof define === "function" && define.amd) {
    define(function () {
      return Huru;
    });
  } else {
    global.Huru = Huru;
  }
})(typeof window !== "undefined" ? window : this);
