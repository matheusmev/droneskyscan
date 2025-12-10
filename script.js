async function checkWeather() {
  const droneModel = document.getElementById("droneModel").value;
  const city = document.getElementById("city").value.trim();

  if (!city) {
    alert("Digite uma cidade!");
    return;
  }

  const res = await fetch(`/api/weather?city=${city}&drone=${droneModel}`);
  const data = await res.json();

  document.getElementById("result").innerHTML = `
    <h2 class="text-xl font-bold mb-4">Resultado:</h2>
    <pre class="bg-gray-800 p-4 rounded text-sm whitespace-pre-wrap">${JSON.stringify(
      data,
      null,
      2
    )}</pre>
  `;
}
