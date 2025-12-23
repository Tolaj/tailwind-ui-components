const showToast = (message, type = "info") => {
  const authToast = document.getElementById("auth-toast");
  const toast = document.createElement("div");
  toast.className =
    "px-5 py-3 rounded-lg shadow-md text-white text-sm flex items-center justify-between gap-4 animate-slide-in";

  if (type === "success") toast.classList.add("bg-green-500");
  else if (type === "error") toast.classList.add("bg-red-500");
  else toast.classList.add("bg-gray-700");

  toast.innerHTML = `
    <span>${message}</span>
    <button class="text-white text-lg leading-none focus:outline-none" onclick="this.parentElement.remove()">×</button>
  `;

  authToast.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("animate-slide-out");
    setTimeout(() => toast.remove(), 300);
  }, 20000);
}

const style = document.createElement("style");
style.textContent = `
  @keyframes slideIn {
    from { opacity: 0; transform: translateX(100%); }
    to { opacity: 1; transform: translateX(0); }
  }
  @keyframes slideOut {
    from { opacity: 1; transform: translateX(0); }
    to { opacity: 0; transform: translateX(100%); }
  }
  .animate-slide-in {
    animation: slideIn 0.4s ease forwards;
  }
  .animate-slide-out {
    animation: slideOut 0.3s ease forwards;
  }
`;

document.head.appendChild(style);