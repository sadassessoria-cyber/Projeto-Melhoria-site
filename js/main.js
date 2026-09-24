(function () {
  "use strict";

  var prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  document.getElementById("year").textContent = new Date().getFullYear();

  /* ---------- Header scroll state ---------- */
  var header = document.getElementById("header");
  function onScroll() {
    if (window.scrollY > 30) header.classList.add("scrolled");
    else header.classList.remove("scrolled");
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Mobile nav toggle ---------- */
  var navToggle = document.getElementById("navToggle");
  var mainNav = document.getElementById("mainNav");
  navToggle.addEventListener("click", function () {
    var isOpen = mainNav.classList.toggle("open");
    navToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
  });
  mainNav.querySelectorAll("a").forEach(function (link) {
    link.addEventListener("click", function () {
      mainNav.classList.remove("open");
      navToggle.setAttribute("aria-expanded", "false");
    });
  });

  /* ---------- Scroll reveal ---------- */
  var revealEls = document.querySelectorAll("[data-reveal]");
  if ("IntersectionObserver" in window && !prefersReducedMotion) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            var delay = entry.target.getAttribute("data-reveal-delay") || 0;
            setTimeout(function () {
              entry.target.classList.add("in-view");
            }, parseInt(delay, 10));
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -60px 0px" }
    );
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("in-view"); });
  }

  /* ---------- Animated counters ---------- */
  var counters = document.querySelectorAll("[data-count]");
  function animateCounter(el) {
    var target = parseFloat(el.getAttribute("data-count"));
    var suffix = el.getAttribute("data-suffix") || "";
    var duration = 1600;
    var start = null;

    if (prefersReducedMotion) {
      el.textContent = target + suffix;
      return;
    }

    function step(ts) {
      if (!start) start = ts;
      var progress = Math.min((ts - start) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      var value = Math.floor(eased * target);
      el.textContent = value + suffix;
      if (progress < 1) requestAnimationFrame(step);
      else el.textContent = target + suffix;
    }
    requestAnimationFrame(step);
  }

  if ("IntersectionObserver" in window) {
    var counterIo = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            animateCounter(entry.target);
            counterIo.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.6 }
    );
    counters.forEach(function (el) { counterIo.observe(el); });
  } else {
    counters.forEach(animateCounter);
  }

  /* ---------- Avaliações do Google (Maps JavaScript API + Places) ---------- */
  var reviewsSection = document.getElementById("avaliacoes");
  var placeId = reviewsSection && reviewsSection.getAttribute("data-place-id").trim();
  var mapsKey = reviewsSection && reviewsSection.getAttribute("data-api-key").trim();

  function loadGoogleMaps(key) {
    return new Promise(function (resolve, reject) {
      window.__sadMapsReady = resolve;
      // Chamado pelo Google quando a chave é inválida ou o domínio não está autorizado
      window.gm_authFailure = function () { reject(new Error("Chave do Google Maps recusada")); };
      var script = document.createElement("script");
      script.src = "https://maps.googleapis.com/maps/api/js?key=" + encodeURIComponent(key) +
        "&v=weekly&loading=async&language=pt-BR&callback=__sadMapsReady";
      script.async = true;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  function renderReviews(place) {
    var reviews = (place.reviews || []).filter(function (r) { return r.text; });
    if (!place.rating || !reviews.length) return false;

    var mapsUrl = place.googleMapsURI || "https://www.google.com/maps/place/?q=place_id:" + placeId;
    document.getElementById("reviewsRating").textContent = place.rating.toFixed(1).replace(".", ",");
    document.getElementById("reviewsStars").style.setProperty("--rating", place.rating);
    var count = document.getElementById("reviewsCount");
    count.textContent = place.userRatingCount + " avaliações no Google";
    count.href = mapsUrl;
    document.getElementById("reviewsWrite").href =
      "https://search.google.com/local/writereview?placeid=" + encodeURIComponent(placeId);

    var track = document.getElementById("reviewsTrack");
    reviews.forEach(function (review) {
      var author = review.authorAttribution || {};
      var name = author.displayName || "Cliente Google";

      var card = document.createElement("article");
      card.className = "review-card";

      var text = document.createElement("p");
      text.className = "review-text";
      text.textContent = "\u201C" + review.text.trim() + "\u201D";
      card.appendChild(text);

      var more = document.createElement("button");
      more.className = "review-more";
      more.type = "button";
      more.textContent = "Ler mais";
      more.hidden = true;
      more.addEventListener("click", function () {
        var expanded = card.classList.toggle("expanded");
        more.textContent = expanded ? "Ler menos" : "Ler mais";
      });
      card.appendChild(more);

      var footer = document.createElement("div");
      footer.className = "review-author";

      var avatar;
      if (author.photoURI) {
        avatar = document.createElement("img");
        avatar.src = author.photoURI;
        avatar.alt = "";
        avatar.loading = "lazy";
        avatar.referrerPolicy = "no-referrer";
      } else {
        avatar = document.createElement("span");
        avatar.textContent = name.charAt(0).toUpperCase();
      }
      avatar.className = "review-avatar";
      footer.appendChild(avatar);

      var info = document.createElement("div");
      var nameEl = document.createElement("strong");
      nameEl.textContent = name;
      if (author.uri) {
        var link = document.createElement("a");
        link.href = author.uri;
        link.target = "_blank";
        link.rel = "noopener";
        link.appendChild(nameEl);
        info.appendChild(link);
      } else {
        info.appendChild(nameEl);
      }
      var meta = document.createElement("div");
      meta.className = "review-meta";
      var stars = document.createElement("span");
      stars.className = "stars stars-sm";
      stars.style.setProperty("--rating", review.rating || 0);
      stars.setAttribute("aria-label", (review.rating || 0) + " de 5 estrelas");
      meta.appendChild(stars);
      if (review.relativePublishTimeDescription) {
        var when = document.createElement("span");
        when.textContent = review.relativePublishTimeDescription;
        meta.appendChild(when);
      }
      info.appendChild(meta);
      footer.appendChild(info);
      card.appendChild(footer);

      track.appendChild(card);
    });

    reviewsSection.hidden = false;

    // "Ler mais" só aparece quando o texto foi cortado
    track.querySelectorAll(".review-card").forEach(function (card) {
      var text = card.querySelector(".review-text");
      if (text.scrollHeight > text.clientHeight + 2) card.querySelector(".review-more").hidden = false;
    });

    var prev = document.getElementById("reviewsPrev");
    var next = document.getElementById("reviewsNext");
    function step() {
      var card = track.querySelector(".review-card");
      return card ? card.offsetWidth + 20 : track.clientWidth;
    }
    function updateArrows() {
      prev.disabled = track.scrollLeft <= 4;
      next.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
    }
    prev.addEventListener("click", function () { track.scrollBy({ left: -step() }); });
    next.addEventListener("click", function () { track.scrollBy({ left: step() }); });
    track.addEventListener("scroll", updateArrows, { passive: true });
    window.addEventListener("resize", updateArrows);
    updateArrows();
    return true;
  }

  function fetchReviews() {
    loadGoogleMaps(mapsKey)
      .then(function () { return google.maps.importLibrary("places"); })
      .then(function (places) {
        var place = new places.Place({ id: placeId, requestedLanguage: "pt-BR" });
        return place.fetchFields({
          fields: ["rating", "userRatingCount", "reviews", "googleMapsURI"]
        }).then(function () { return place; });
      })
      .then(renderReviews)
      .catch(function (err) {
        // Em caso de erro a seção continua oculta; o resto do site segue normal
        if (window.console) console.warn("Avaliações do Google indisponíveis:", err);
      });
  }

  // Só consulta o Google quando o visitante se aproxima da seção (economiza cota da API)
  if (placeId && mapsKey) {
    var anchor = document.getElementById("sobre") || reviewsSection;
    if ("IntersectionObserver" in window) {
      var reviewsIo = new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) {
          reviewsIo.disconnect();
          fetchReviews();
        }
      }, { rootMargin: "400px 0px" });
      reviewsIo.observe(anchor);
    } else {
      fetchReviews();
    }
  }

  /* ---------- Hero particle network ---------- */
  var canvas = document.getElementById("networkCanvas");
  if (canvas && !prefersReducedMotion) {
    var ctx = canvas.getContext("2d");
    var hero = document.querySelector(".hero");
    var particles = [];
    var mouse = { x: null, y: null };
    var width, height, dpr;

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = hero.offsetWidth;
      height = hero.offsetHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = width + "px";
      canvas.style.height = height + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      initParticles();
    }

    function initParticles() {
      var count = Math.min(70, Math.floor((width * height) / 18000));
      particles = [];
      for (var i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.35,
          vy: (Math.random() - 0.5) * 0.35,
          r: Math.random() * 1.6 + 0.6
        });
      }
    }

    function draw() {
      ctx.clearRect(0, 0, width, height);
      var linkDist = 130;

      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        for (var j = i + 1; j < particles.length; j++) {
          var q = particles[j];
          var dx = p.x - q.x, dy = p.y - q.y;
          var dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < linkDist) {
            ctx.strokeStyle = "rgba(150, 190, 220," + (1 - dist / linkDist) * 0.18 + ")";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.stroke();
          }
        }
      }

      for (var k = 0; k < particles.length; k++) {
        var pt = particles[k];
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(243, 211, 138, 0.55)";
        ctx.fill();
      }

      requestAnimationFrame(draw);
    }

    var resizeTimer;
    window.addEventListener("resize", function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resize, 200);
    });

    resize();
    requestAnimationFrame(draw);
  }
})();
