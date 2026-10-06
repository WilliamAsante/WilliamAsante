(() => {
  "use strict";

  /* Settings ------------------------------------------------------------- */

  // Leave empty to use the visitor's clock, or set your bakery's time zone
  // (for example "America/New_York" or "Europe/London") so the open/closed
  // status is right for visitors in other places.
  const TIMEZONE = "";
  // Minutes a batch counts as "Just out" after it leaves the oven.
  const FRESH_FOR = 60;
  // Minutes before a batch's time that it shows as "In the oven".
  const IN_OVEN_FOR = 45;
  // Days of notice needed for orders.
  const ORDER_NOTICE_DAYS = 2;
  // Where order requests go.
  const ORDER_EMAIL = "orders@example.com";

  /* Helpers -------------------------------------------------------------- */

  const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const SHORT_DAYS = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

  const toMinutes = (hhmm) => {
    const [h, m] = hhmm.split(":").map(Number);
    return h * 60 + m;
  };

  const formatTime = (minutes) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "pm" : "am"}`;
  };

  const toISODate = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const formatDate = (d) =>
    d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  // Current weekday (0 = Sunday) and minutes since midnight at the bakery.
  function bakeryNow() {
    const now = new Date();
    if (!TIMEZONE) {
      return { day: now.getDay(), minutes: now.getHours() * 60 + now.getMinutes() };
    }
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat("en-US", {
        timeZone: TIMEZONE,
        weekday: "short",
        hour: "numeric",
        minute: "numeric",
        hourCycle: "h23",
      })
        .formatToParts(now)
        .map((p) => [p.type, p.value])
    );
    return { day: SHORT_DAYS[parts.weekday], minutes: Number(parts.hour) * 60 + Number(parts.minute) };
  }

  /* Mobile navigation ---------------------------------------------------- */

  const navToggle = document.querySelector(".nav-toggle");
  const nav = document.getElementById("site-nav");

  if (navToggle && nav) {
    const setNavOpen = (open) => {
      navToggle.setAttribute("aria-expanded", String(open));
      nav.classList.toggle("is-open", open);
    };

    navToggle.addEventListener("click", () => {
      setNavOpen(navToggle.getAttribute("aria-expanded") !== "true");
    });

    nav.addEventListener("click", (event) => {
      if (event.target.closest("a")) setNavOpen(false);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && navToggle.getAttribute("aria-expanded") === "true") {
        setNavOpen(false);
        navToggle.focus();
      }
    });

    window.matchMedia("(min-width: 761px)").addEventListener("change", (event) => {
      if (event.matches) setNavOpen(false);
    });
  }

  /* Opening hours and today's bake ---------------------------------------- */

  const hourRows = [...document.querySelectorAll(".hours tr[data-day]")];
  const hours = new Map(
    hourRows.map((row) => [
      Number(row.dataset.day),
      row.dataset.open ? { open: toMinutes(row.dataset.open), close: toMinutes(row.dataset.close) } : null,
    ])
  );

  function nextOpening(day, minutes) {
    for (let offset = 0; offset < 8; offset++) {
      const d = (day + offset) % 7;
      const h = hours.get(d);
      if (!h || (offset === 0 && minutes >= h.open)) continue;
      return { offset, day: d, open: h.open };
    }
    return null;
  }

  function updateStatus() {
    const { day, minutes } = bakeryNow();
    const today = hours.get(day);
    const isOpen = Boolean(today) && minutes >= today.open && minutes < today.close;

    hourRows.forEach((row) => {
      const isToday = Number(row.dataset.day) === day;
      row.classList.toggle("is-today", isToday);
      let label = row.querySelector(".today-label");
      if (isToday && !label) {
        label = document.createElement("span");
        label.className = "today-label";
        label.textContent = "Today";
        row.querySelector("th").append(label);
      } else if (!isToday && label) {
        label.remove();
      }
    });

    const status = document.querySelector("[data-open-status]");
    if (status) {
      status.classList.toggle("is-open", isOpen);
      if (isOpen) {
        status.textContent = `Open now until ${formatTime(today.close)}`;
      } else {
        const next = nextOpening(day, minutes);
        if (next) {
          const when = next.offset === 0 ? "today" : next.offset === 1 ? "tomorrow" : DAY_NAMES[next.day];
          status.textContent = `Closed now. Opens ${when} at ${formatTime(next.open)}`;
        } else {
          status.textContent = "Closed";
        }
      }
    }

    document.querySelectorAll(".bake[data-time]").forEach((item) => {
      const time = toMinutes(item.dataset.time);
      const label = item.querySelector(".bake-status");
      item.classList.remove("is-fresh", "is-ready", "is-upcoming");

      if (!isOpen) {
        label.textContent = "";
      } else if (minutes < time) {
        item.classList.add("is-upcoming");
        label.textContent = time - minutes <= IN_OVEN_FOR ? "In the oven" : "Later today";
      } else if (minutes - time < FRESH_FOR) {
        item.classList.add("is-fresh");
        label.textContent = "Just out";
      } else {
        item.classList.add("is-ready");
        label.textContent = "Ready";
      }
    });
  }

  updateStatus();
  setInterval(updateStatus, 60 * 1000);

  /* Menu filter ---------------------------------------------------------- */

  const chips = document.querySelectorAll(".chip[data-filter]");
  const groups = document.querySelectorAll(".menu-group[data-category]");

  chips.forEach((chip) => {
    chip.addEventListener("click", () => {
      const filter = chip.dataset.filter;
      chips.forEach((c) => c.setAttribute("aria-pressed", String(c === chip)));
      groups.forEach((group) => {
        group.hidden = filter !== "all" && group.dataset.category !== filter;
      });
    });
  });

  /* Order form ----------------------------------------------------------- */

  const form = document.getElementById("order-form");

  if (form) {
    const dateInput = form.elements.date;
    const statusEl = document.getElementById("form-status");
    const minDate = new Date();
    minDate.setDate(minDate.getDate() + ORDER_NOTICE_DAYS);
    dateInput.min = toISODate(minDate);

    const pickupDate = () => new Date(`${dateInput.value}T12:00`);

    const errorFor = (input) => {
      const v = input.validity;
      switch (input.name) {
        case "name":
          return v.valueMissing ? "Enter your name." : "";
        case "email":
          if (v.valueMissing) return "Enter your email so we can confirm your order.";
          return v.typeMismatch ? "Enter an email address like name@example.com." : "";
        case "item":
          return v.valueMissing ? "Choose what you'd like to order." : "";
        case "date": {
          if (v.valueMissing || v.badInput) return "Choose a pickup date.";
          if (v.rangeUnderflow) return `We need ${ORDER_NOTICE_DAYS} days' notice. Choose ${formatDate(minDate)} or later.`;
          const d = pickupDate();
          if (!hours.get(d.getDay())) return `We're closed on ${DAY_NAMES[d.getDay()]}s. Choose another day.`;
          return "";
        }
        default:
          return "";
      }
    };

    const validateField = (input) => {
      const error = document.getElementById(`${input.id}-error`);
      if (!error) return true;
      const message = errorFor(input);
      error.textContent = message;
      if (message) {
        input.setAttribute("aria-invalid", "true");
        input.setAttribute("aria-describedby", error.id);
      } else {
        input.removeAttribute("aria-invalid");
        input.removeAttribute("aria-describedby");
      }
      return !message;
    };

    const checkedFields = [...form.querySelectorAll("input, select")].filter((el) =>
      document.getElementById(`${el.id}-error`)
    );

    checkedFields.forEach((input) => {
      const recheck = () => {
        if (input.getAttribute("aria-invalid") === "true") validateField(input);
      };
      input.addEventListener("input", recheck);
      input.addEventListener("change", recheck);
    });

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      statusEl.textContent = "";

      const invalid = checkedFields.filter((input) => !validateField(input));
      if (invalid.length) {
        invalid[0].focus();
        return;
      }

      const data = new FormData(form);
      const lines = [
        "New order request",
        "",
        `Name: ${data.get("name")}`,
        `Email: ${data.get("email")}`,
        `Phone: ${data.get("phone") || "Not given"}`,
        `Order: ${data.get("item")}`,
        `Pickup date: ${formatDate(pickupDate())}`,
        "",
        "Details:",
        data.get("details") || "None",
      ];
      const subject = `Order request: ${data.get("item")} for ${formatDate(pickupDate())}`;
      const href = `mailto:${ORDER_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join("\n"))}`;

      window.location.href = href;

      statusEl.innerHTML = "";
      statusEl.append(
        "Your email app should open with your order filled in. Send it and we'll reply within one working day. If nothing opened, email ",
        Object.assign(document.createElement("a"), { href: `mailto:${ORDER_EMAIL}`, textContent: ORDER_EMAIL }),
        "."
      );
    });
  }

  /* Footer year ---------------------------------------------------------- */

  document.querySelectorAll("[data-year]").forEach((el) => {
    el.textContent = String(new Date().getFullYear());
  });
})();
