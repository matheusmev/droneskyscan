// api/weather.js (CommonJS)
const drones = require("../drones.json");

module.exports = async function handler(req, res) {
  try {
    console.log("OPENWEATHER KEY:", process.env.OPENWEATHER_API_KEY);

    const { city, drone } = req.query;
    if (!city || !drone) {
      return res.status(400).json({
        error: "Forneça city e drone nos query params."
      });
    }

    // Aqui funciona com o JSON como objeto
    const droneSpecs = drones[drone];
    if (!droneSpecs) {
      return res.status(400).json({
        error: "Drone não encontrado."
      });
    }

    const maxWindKmh = droneSpecs.maxWindKmh;

    const apiKey = process.env.OPENWEATHER_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: "Chave da API não configurada."
      });
    }

    // Forecast de 5 dias (3h por bloco)
    const url = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(
      city
    )}&units=metric&appid=${apiKey}`;

    const fetchResp = await fetch(url);
    const weather = await fetchResp.json();

    if (weather.cod !== "200") {
      return res.status(400).json({
        error: "Cidade não encontrada ou OpenWeather retornou erro.",
        details: weather
      });
    }

    // Próximos 6 blocos → 18h de previsão
    const nextBlocks = (weather.list || []).slice(0, 6);

    function decideStatus(windKmh, limit) {
      if (windKmh <= limit * 0.75) return "Seguro";
      if (windKmh <= limit) return "Arriscado";
      return "Não recomendado";
    }

    function humanAdvice(status, windKmh, limit) {
      if (status === "Seguro")
        return "Condições favoráveis — risco baixo para este modelo.";

      if (status === "Arriscado")
        return `Vento próximo ao limite do drone (${windKmh} km/h vs limite ${limit} km/h). Considere rajadas e avalie bem antes de voar.`;

      return `Vento acima do limite recomendado (${windKmh} km/h > ${limit} km/h). Não é seguro voar.`;
    }

    const results = nextBlocks.map((item) => {
      const wind_mps = item.wind?.speed || 0;
      const gust_mps = item.wind?.gust || wind_mps;

      const wind_kmh = Number((wind_mps * 3.6).toFixed(1));
      const gust_kmh = Number((gust_mps * 3.6).toFixed(1));
      const wind_mph = Number((wind_mps * 2.2369).toFixed(1));
      const gust_mph = Number((gust_mps * 2.2369).toFixed(1));

      const status = decideStatus(wind_kmh, maxWindKmh);
      const humanMessage = humanAdvice(status, wind_kmh, maxWindKmh);

      return {
        dt: item.dt,
        time: item.dt_txt,
        temp_c: item.main?.temp ?? null,
        pop: item.pop ?? 0,
        wind: { mps: wind_mps, kmh: wind_kmh, mph: wind_mph },
        gust: { mps: gust_mps, kmh: gust_kmh, mph: gust_mph },
        status,
        humanMessage
      };
    });

    // Recomendações gerais
    let overall;
    if (results.every((r) => r.status === "Seguro")) overall = "Seguro";
    else if (results.some((r) => r.status === "Não recomendado"))
      overall = "Não recomendado";
    else overall = "Arriscado";

    const overallMessage = {
      Seguro: "Condições boas para voo. Faça sempre checagens pré-voo.",
      Arriscado: "Condições variáveis — atenção às rajadas e visibilidade.",
      "Não recomendado": "Condições não seguras — não recomendamos voar."
    }[overall];

    return res.status(200).json({
      drone: { name: drone, maxWindKmh },
      location: {
        city: weather.city?.name || city,
        country: weather.city?.country || null,
        coord: weather.city?.coord || null
      },
      overall,
      overallMessage,
      results
    });
  } catch (err) {
    console.error("SERVER ERROR:", err);
    return res.status(500).json({
      error: "Erro interno no servidor.",
      details: err.message
    });
  }
};
