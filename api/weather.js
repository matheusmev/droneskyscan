export default async function handler(req, res) {
  try {
    console.log("OPENWEATHER KEY:", process.env.OPENWEATHER_KEY);

    const { city, drone } = req.query;

    const drones = {
      "DJI Mini 3 Pro": { maxWind: 10.7 },
      "DJI Mini 4 Pro": { maxWind: 12 }
    };

    const droneSpecs = drones[drone];

    if (!droneSpecs) {
      return res.status(400).json({ error: "Drone não encontrado." });
    }

    const apiKey = process.env.OPENWEATHER_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "Chave da API não configurada." });
    }

    const url = `https://api.openweathermap.org/data/2.5/forecast?q=${city}&units=metric&appid=${apiKey}`;

    const weather = await fetch(url).then(r => r.json());

    // Se cidade não existir
    if (weather.cod !== "200") {
      return res.status(400).json({
        error: "Cidade não encontrada ou OpenWeather retornou erro.",
        details: weather
      });
    }

    const nextHours = weather.list.slice(0, 6).map(item => ({
      time: item.dt_txt,
      temp: item.main.temp,
      windKmh: (item.wind.speed * 3.6).toFixed(1),
      windMph: (item.wind.speed * 2.23694).toFixed(1),
      safe: item.wind.speed * 3.6 <= droneSpecs.maxWind
    }));

    return res.status(200).json({
      drone,
      city,
      recommendation:
        nextHours.every(h => h.safe)
          ? "Seguro para voo"
          : nextHours.some(h => h.safe)
          ? "Cuidado — condições variam"
          : "Não recomendado",
      nextHours
    });
  } catch (err) {
    console.error("SERVER ERROR:", err);
    return res.status(500).json({ error: "Erro interno no servidor." });
  }
}
