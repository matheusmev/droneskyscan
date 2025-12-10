const drones = require("../drones.json");

module.exports = async function handler(req, res) {
  try {
    const { city, drone } = req.query;

    // drones é ARRAY → encontrar
    const droneSpecs = drones.find(d => d.id === drone);

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

    const url =
      `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}&units=metric&appid=${apiKey}`;

    const fetchResp = await fetch(url);
    const weather = await fetchResp.json();

    if (weather.cod !== "200") {
      return res.status(400).json({
        error: "Cidade não encontrada.",
        details: weather
      });
    }

    const nextBlocks = weather.list.slice(0, 6);

    // Funções de status
    const decideStatus = (wind, limit) => {
      if (wind <= limit * 0.75) return "Seguro";
      if (wind <= limit) return "Arriscado";
      return "Não recomendado";
    };

    const humanAdvice = (status, wind, limit) => {
      if (status === "Seguro") return "Condições favoráveis.";
      if (status === "Arriscado") return `Vento perto do limite (${wind} km/h).`;
      return `Acima do limite (${wind} km/h). Não recomendado.`;
    };

    const results = nextBlocks.map(item => {
      const wind_mps = item.wind?.speed || 0;
      const gust_mps = item.wind?.gust || wind_mps;

      const wind_kmh = Number((wind_mps * 3.6).toFixed(1));
      const gust_kmh = Number((gust_mps * 3.6).toFixed(1));

      const status = decideStatus(wind_kmh, maxWindKmh);

      return {
        time: item.dt_txt,
        temp_c: item.main.temp,
        pop: item.pop,
        wind: { kmh: wind_kmh },
        gust: { kmh: gust_kmh },
        status,
        humanMessage: humanAdvice(status, wind_kmh, maxWindKmh)
      };
    });

    return res.status(200).json({
      drone: droneSpecs,
      location: {
        city: weather.city.name,
        country: weather.city.country,
        coord: weather.city.coord
      },
      overall: results.some(r => r.status === "Não recomendado")
        ? "Não recomendado"
        : results.some(r => r.status === "Arriscado")
        ? "Arriscado"
        : "Seguro",
      overallMessage: "Resumo baseado nas próximas 18h.",
      results
    });

  } catch (err) {
    return res.status(500).json({
      error: "Erro interno.",
      details: err.message
    });
  }
};
