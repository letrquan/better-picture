(() => {
  const REQUEST_EVENT = "better-picture-youtube-player-request";
  const RESPONSE_EVENT = "better-picture-youtube-player-response";

  window.addEventListener(REQUEST_EVENT, (event) => {
    const { requestId, videoId } = event.detail || {};

    const respond = (detail) => {
      window.dispatchEvent(new CustomEvent(RESPONSE_EVENT, {
        detail: {
          requestId,
          ...detail
        }
      }));
    };

    if (!requestId || !videoId) {
      respond({ ok: false, error: "Missing request data" });
      return;
    }

    try {
      const player = document.querySelector("#movie_player");
      if (player && typeof player.loadVideoById === "function") {
        player.loadVideoById(videoId);
        respond({ ok: true, method: "loadVideoById" });
        return;
      }

      respond({ ok: false, error: "YouTube player API unavailable" });
    } catch (error) {
      respond({ ok: false, error: error.message });
    }
  });
})();
