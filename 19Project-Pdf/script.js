// Display logged-in user
const loggedInUser = localStorage.getItem("loggedInUser");
if (loggedInUser) {
  document.getElementById("logged-in-user").textContent = `Welcome, ${loggedInUser}`;
}

// Add functionality to add or remove files dynamically
const maxFiles = 7;
const fileInputsContainer = document.getElementById("file-inputs");
const addFileButton = document.getElementById("add-file-btn");

addFileButton.addEventListener("click", () => {
  const fileInputs = document.querySelectorAll("#file-inputs .file-input");
  if (fileInputs.length < maxFiles) {
    const newFileInput = document.createElement("div");
    newFileInput.classList.add("file-input");
    newFileInput.innerHTML = `
      <input type="file" name="compareFiles" accept=".pdf">
      <button type="button" class="delete-file-btn">Delete</button>
    `;
    fileInputsContainer.appendChild(newFileInput);
  } else {
    alert("You can only add up to 7 files.");
  }
});

fileInputsContainer.addEventListener("click", (e) => {
  if (e.target.classList.contains("delete-file-btn")) {
    e.target.parentElement.remove();
  }
});

// Handle file uploads and comparison
document.getElementById("file-upload-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const formData = new FormData(e.target);
  const response = await fetch("/upload", { method: "POST", body: formData });
  const result = await response.json();

  if (result.report) {
    localStorage.setItem("similarityReport", JSON.stringify(result.report));
    window.location.href = "similarity_report.html";
  }
});
