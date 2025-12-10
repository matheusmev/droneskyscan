// ================================
// Carregar lista de drones (ARRAY)
// ================================
async function carregarDrones() {
    try {
        const resposta = await fetch("/drones.json"); // raiz do projeto
        if (!resposta.ok) throw new Error("Erro ao carregar drones.json");

        const drones = await resposta.json(); // agora é ARRAY
        const droneSelect = document.getElementById("droneSelect");

        droneSelect.innerHTML = '<option value="">Selecione...</option>';

        drones.forEach(drone => {
            const opt = document.createElement("option");
            opt.value = drone.id;
            opt.textContent = drone.name;
            droneSelect.appendChild(opt);
        });

    } catch (erro) {
        console.error("Erro ao carregar lista:", erro);
        alert("Não foi possível carregar a lista de drones.");
    }
}

document.addEventListener("DOMContentLoaded", carregarDrones);

// ================================
// Usar localização atual
// ================================
document.getElementById("geoBtn").addEventListener("click", () => {
    if (!navigator.geolocation) {
        alert("Geolocalização não suportada.");
        return;
    }

    navigator.geolocation.getCurrentPosition(async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;

        try {
            const resp = await fetch(`https://geocode.maps.co/reverse?lat=${lat}&lon=${lon}`);
            const dados = await resp.json();

            const cidade =
                dados?.address?.city ||
                dados?.address?.town ||
                dados?.address?.village ||
                dados?.address?.state;

            if (cidade) {
                document.getElementById("cityInput").value = cidade;
                document.getElementById("locationInfo").innerText =
                    `Localização detectada: ${cidade}`;
            } else {
                alert("Não foi possível identificar a cidade.");
            }

        } catch {
            alert("Erro ao identificar a cidade.");
        }

    }, () => {
        alert("Não foi possível acessar sua localização.");
    });
});

// ================================
// Consultar condições de voo
// ================================
document.getElementById("checkBtn").addEventListener("click", async () => {
    const droneId = document.getElementById("droneSelect").value;
    const cidade = document.getElementById("cityInput").value.trim();

    if (!droneId) return alert("Selecione um drone.");
    if (!cidade) return alert("Digite a cidade.");

    try {
        const resposta = await fetch(`/api/weather?drone=${droneId}&city=${encodeURIComponent(cidade)}`);
        const dados = await resposta.json();

        if (dados.error) {
            document.getElementById("result").innerHTML =
                `<p class="erro">${dados.error}</p>`;
            return;
        }

        renderizarResultado(dados);
        renderizarPrevisao(dados.results);

    } catch (erro) {
        console.error("Erro na checagem:", erro);
        alert("Falha ao consultar o servidor.");
    }
});

// ================================
// Renderizar cartão principal
// ================================
function renderizarResultado(data) {
    const result = document.getElementById("result");

    result.innerHTML = `
      <h3>${data.location.city}, ${data.location.country || ""}</h3>
      <p><strong>Drone:</strong> ${data.drone.name}</p>
      <p><strong>Condição geral:</strong> ${data.overall}</p>
      <p>${data.overallMessage}</p>
    `;
}

// ================================
// Renderizar previsão hora a hora
// ================================
function renderizarPrevisao(lista) {
    const container = document.getElementById("hourlyContainer");
    container.innerHTML = "";

    lista.forEach(h => {
        const card = document.createElement("div");
        card.className = "hour-card";

        card.innerHTML = `
          <p class="hour">${h.time}</p>
          <p>${h.temp_c}°C</p>
          <p>🌬 ${h.wind.kmh} km/h</p>
          <p>☁ ${h.pop * 100}%</p>
        `;

        container.appendChild(card);
    });
}
