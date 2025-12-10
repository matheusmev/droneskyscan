// =====================
// LOAD DRONES
// =====================
async function loadDrones() {
  const res = await fetch("drones.json");
  const drones = await res.json();
  const select = document.getElementById("droneSelect");

  select.innerHTML = drones
    .map(dr => `<option value="${dr.name}">${dr.name}</option>`)
    .join("");
}

loadDrones();

// =====================
// GEOLOCATION BUTTON
// =====================
document.getElementById("geoBtn").addEventListener("click", () => {
  navigator.geolocation.getCurrentPosition(async pos => {
    const { latitude, longitude } = pos.coords;

    const info = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
    );

    const data = await info.json();
    const city =
      data.address.city ||
      data.address.town ||
      data.address.village ||
      data.address.municipality;

    document.getElementById("cityInput").value = city;
  });
});

// =====================
// CHECK WEATHER
// =====================
document.getElementById("checkBtn").addEventListener("click", async () => {
  const city = document.getElementById("cityInput").value;
  const drone = document.getElementById("droneSelect").value;

  if (!city) return alert("Digite uma cidade.");

  const res = await fetch(`/api/weather?city=${city}&drone=${drone}`);
  const data = await res.json();

  document.getElementById(
    "locationInfo"
  ).innerText = `Condições de voo em ${data.resolvedCity || city}, Brasil — usando o drone ${drone}.`;

  renderMainResult(data);
  renderHourly(data.nextHours);
});

// =====================
// MAIN RESULT
// =====================
function renderMainResult(data) {
  const box = document.getElementById("result");

  box.innerHTML = `
    <h3>Status: <span class="${
      data.recommendation === "Seguro" ? "green" : "red"
    }">${data.recommendation}</span></h3>

    <p>Drone: <b>${data.drone}</b></p>
    <p>Vento agora: <b>${data.nextHours[0].windKmh} km/h</b></p>
    <p>Temperatura: <b>${data.nextHours[0].temp}°C</b></p>
  `;
}

// =====================
// HOURLY 24H FORECAST
// =====================
function renderHourly(list) {
  const grid = document.getElementById("hourlyContainer");
  grid.innerHTML = "";

  list.forEach(h => {
    const card = document.createElement("div");
    card.className = "hourly-card";
    card.innerHTML = `
      <p><b>${h.time.slice(11, 16)}</b></p>
      <p>${h.temp}°C</p>
      <p>${h.windKmh} km/h</p>
      <p class="${h.safe ? "green" : "red"}">${
      h.safe ? "Seguro" : "Arriscado"
    }</p>
    `;
    grid.appendChild(card);
  });
}
