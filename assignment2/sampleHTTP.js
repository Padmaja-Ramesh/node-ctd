const http = require("http");

const server = http.createServer((req, res) => {
  const currentTime = new Date().toLocaleTimeString();
  if (req.url == "/time") {
    const json = { time: currentTime };
    res.writeHeader(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(json));
  }
  if (req.url == "/timePage") {
    const htmlString = `
                <!DOCTYPE html>
                <html>
                <body>
                <h1>Clock</h1>
                <button id="getTimeBtn">Get the Time</button>
                <p id="time"></p>
                <script>
                document.getElementById('getTimeBtn').addEventListener('click', async () => {
                    const res = await fetch('/time');
                    const timeObj = await res.json();
                    console.log(timeObj);
                    const timeP = document.getElementById('time');
                    timeP.textContent = timeObj.time;
                });
                </script>
                </body>
                </html>
                `;

    res.writeHeader(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(htmlString);
  }
});

server.listen(8000);
