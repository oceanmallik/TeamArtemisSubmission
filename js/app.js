let crewData = null;

function render(crewMember) {
  if (!crewMember) return;
  console.log(crewMember.name, crewMember.days ? crewMember.days.length : 0);
}

function init() {
  const crewSelect = document.getElementById("crew-select");
  const appMain = document.getElementById("app");

  fetch("data/crew.json")
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then((data) => {
      crewData = data;
      window.crewData = data;

      if (crewSelect && data.crew && Array.isArray(data.crew)) {
        crewSelect.innerHTML = "";
        data.crew.forEach((member) => {
          const option = document.createElement("option");
          option.value = member.id;
          option.textContent = member.name;
          crewSelect.appendChild(option);
        });

        if (data.crew.length > 0) {
          render(data.crew[0]);
        }
      }
    })
    .catch((error) => {
      console.error("Error loading crew data:", error);
      if (appMain) {
        appMain.innerHTML = `
          <div class="panel" style="grid-column: 1 / -1; color: var(--red);">
            <h2>Unable to Load Data</h2>
            <p>Error loading crew data. The page must be served via a local server (e.g., run <code>python3 -m http.server 8000</code>) due to browser security restrictions on local file requests.</p>
          </div>
        `;
      }
    });

  if (crewSelect) {
    crewSelect.addEventListener("change", (e) => {
      if (crewData && Array.isArray(crewData.crew)) {
        const member = crewData.crew.find((m) => m.id === e.target.value);
        if (member) {
          render(member);
        }
      }
    });
  }
}

init();

window.render = render;
