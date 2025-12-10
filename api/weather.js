// api/weather.js (CommonJS)
const drones = require("../drones.json");

module.exports = async function handler(req, res) {
  try {
    console.log("OPENWEATHER KEY:", process.env.OPENWEATHER_API_KEY);

    const { city, drone } = req.query;
    if (!city || !drone) return res.status(400).json({ error: "Forneça city e drone nos query params." });

    const droneSpecs = drones[drone];
    if (!droneSpecs) return res.status(400).json({ error: "Drone não encontrado." });

    const apiKey = process.env.OPENWEATHER_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "Chave da API não configurada." });

    // Usamos a API 5 day / 3 hour forecast — lista em blocos de 3h. Pegamos 6 próximos blocos para cobrir ~18 horas.
    const url = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}&units=metric&appid=${apiKey}`;
    const fetchResp = await fetch(url);
    const weather = await fetchResp.json();

    if (weather.cod !== "200") {
      return res.status(400).json({ error: "Cidade não encontrada ou OpenWeather retornou erro.", details: weather });
    }

    // Pegamos os próximos 6 registros (cada um é ~3h). Se preferir hora-a-hora muda pra OneCall (mais requisições).
    const nextBlocks = (weather.list || []).slice(0, 6);

    function decideStatus(windKmh, maxKmh) {
      if (windKmh <= maxKmh * 0.75) return "Seguro";
      if (windKmh <= maxKmh) return "Arriscado";
      return "Não recomendado";
    }

    function humanAdvice(status, windKmh, maxKmh) {
      if (status === "Seguro") return "Condições favoráveis — risco baixo para este modelo.";
      if (status === "Arriscado") {
        return `Vento próximo ao limite do drone (${windKmh} km/h vs limite ${maxKmh} km/h). Avalie rajadas e considere adiar.`;
      }
      return `Vento acima do limite recomendado (${windKmh} km/h > ${maxKmh} km/h). Não é seguro voar.`;
    }

    const results = nextBlocks.map(item => {
      const wind_mps = item.wind && item.wind.speed ? item.wind.speed : 0;
      const gust_mps = item.wind && item.wind.gust ? item.wind.gust : wind_mps;
      const wind_kmh = Number((wind_mps * 3.6).toFixed(1));
      const gust_kmh = Number((gust_mps * 3.6).toFixed(1));
      const wind_mph = Number((wind_mps * 2.2369362920544).toFixed(1));
      const gust_mph = Number((gust_mps * 2.2369362920544).toFixed(1));

      const status = decideStatus(wind_kmh, droneSpecs.maxWindKmh);
      const humanMessage = humanAdvice(status, wind_kmh, droneSpecs.maxWindKmh);

      return {
        dt: item.dt,
        time: item.dt_txt,
        temp_c: item.main ? item.main.temp : null,
        pop: item.pop ?? 0,
        wind: {
          mps: Number(wind_mps.toFixed(2)),
          kmh: wind_kmh,
          mph: wind_mph
        },
        gust: {
          mps: Number(gust_mps.toFixed(2)),
          kmh: gust_kmh,
          mph: gust_mph
        },
        status,
        humanMessage
      };
    });

    // overall recommendation: se todos são "Seguro" -> Seguro; se algum "Não recomendado" -> Não recomendado; else Arriscado
    let overall;
    if (results.every(r => r.status === "Seguro")) overall = "Seguro";
    else if (results.some(r => r.status === "Não recomendado")) overall = "Não recomendado";
    else overall = "Arriscado";

    const overallMessage = {
      "Seguro": "Condições boas para voo. Use sempre checagens pré-voo.",
      "Arriscado": "Condições variáveis — atenção às rajadas e à visibilidade.",
      "Não recomendado": "Condições não seguras — não recomendamos voo."
    }[overall];

    return res.status(200).json({
      drone: { name: drone, ...droneSpecs },
      location: { city: weather.city && weather.city.name ? weather.city.name : city, coord: weather.city && weather.city.coord ? weather.city.coord : null },
      overall,
      overallMessage,
      results
    });

  } catch (err) {
    console.error("SERVER ERROR:", err);
    return res.status(500).json({ error: "Erro interno no servidor.", details: err.message });
  }
};
