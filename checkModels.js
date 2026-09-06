const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8');
const match = env.match(/GROQ_API_KEY=\"?([^\"]+)\"?/);
if (match) {
  fetch('https://api.groq.com/openai/v1/models', {
    headers: { Authorization: 'Bearer ' + match[1].trim() }
  })
  .then(r => r.json())
  .then(d => {
    if (d.error) {
      console.log("Error:", d.error);
    } else if (d.data) {
      console.log("Models:", d.data.map(m => m.id).join(', '));
    } else {
      console.log(d);
    }
  });
}
