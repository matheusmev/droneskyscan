export default async function handler(req, res) {
  const { city, drone } = req.query;

  const drones = {
    "DJI Mini 3 Pro": { maxWind: 10.7 },
    "DJI Mini 4 Pro": { maxWind: 12 },
  };

  const droneSpecs = drones[drone];

  const apiKey = process.env.OPENWEATHER_KEY;
  const url = `https://api.openweathermap.org/data/2.5/forecast?q=${city}&units=metric&appid=${apiKey}`;

  const weather = await fetch(url).then(r => r.json());

  const nextHours = weather.list.slice(0, 6).map(item => ({
    time: item.dt_txt,
    temp: item.main.temp,
    windKmh: (item.wind.speed * 3.6).toFixed(1),
    windMph: (item.wind.speed * 2.23694).toFixed(1),
    safe: item.wind.speed * 3.6 <= droneSpecs.maxWind
  }));

  res.status(200).json({
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
}
