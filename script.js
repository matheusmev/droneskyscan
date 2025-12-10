// ================================
// Carregar lista de drones
// ================================
async function carregarDrones() {
    try {
        const resposta = await fetch("/drones.json"); // <-- RAIZ DO PROJETO
        if (!resposta.ok) throw new Error("Erro ao carregar drones.json");

        const drones = await resposta.json();
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

            const cidade = dados?.address?.city ||
                           dados?.address?.town ||
                           dados?.address?.village ||
                           dados?.address?.state;

            if (cidade) {
                document.getElementById("cityInput").value = cidade;
                document.getElementById("locationInfo").innerText = `Localização detectada: ${cidade}`;
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

    if (!droneId) {
        alert("Selecione um drone.");
        return;
    }

    if (!cidade) {
        alert("Digite a cidade.");
        return;
    }

    try {
        const resposta = await fetch(`/api/check?drone=${droneId}&city=${encodeURIComponent(cidade)}`);
        const dados = await resposta.json();

        if (dados.error) {
            document.getElementById("result").innerHTML =
                `<p class="erro">${dados.error}</p>`;
            return;
        }

        renderizarResultado(dados);
        renderizarPrevisao(dados.forecast);

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
      <h3>${data.city}</h3>
      <p><strong>Condição:</strong> ${data.status}</p>

      <ul class="result-list">
        <li><strong>Vento:</strong> ${data.wind} km/h</li>
        <li><strong>Gusts:</strong> ${data.gust} km/h</li>
        <li><strong>Nuvens:</strong> ${data.clouds}%</li>
        <li><strong>Visibilidade:</strong> ${data.visibility} km</li>
      </ul>

      <p class="status ${data.statusClass}">${data.message}</p>
    `;
}

// ================================
// Renderizar previsão hora a hora
// ================================
function renderizarPrevisao(previsao) {
    const container = document.getElementById("hourlyContainer");
    container.innerHTML = "";

    previsao.forEach(h => {
        const card = document.createElement("div");
        card.className = "hour-card";

        card.innerHTML = `
          <p class="hour">${h.time}</p>
          <p>${h.temp}°C</p>
          <p>🌬 ${h.wind} km/h</p>
          <p>☁ ${h.clouds}%</p>
        `;

        container.appendChild(card);
    });
}
