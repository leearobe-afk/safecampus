var firebaseConfig = {
  apiKey: "AIzaSyDqUk2OCIFaw1sn_QY47xLV0D_MD0aFjLM",
  authDomain: "safecampus-81c3d.firebaseapp.com",
  databaseURL: "https://safecampus-81c3d-default-rtdb.asia-southeast1.firebaseapp.com",
  projectId: "safecampus-81c3d",
  storageBucket: "safecampus-81c3d.firebasestorage.app",
  messagingSenderId: "884629956826",
  appId: "1:884629956826:web:c803deb4a35e9da2591de3",
  measurementId: "G-YC0EZ8BG9D"
};

firebase.initializeApp(firebaseConfig);
var database = firebase.database();
var incidentsRef = database.ref("incidents");

var STORAGE_ADMIN = "safecampus_admin_logged_in";

var incidents = [];
var selectedCategory = "other";
var selectedUrgency = "medium";
var isAdminLoggedIn = localStorage.getItem(STORAGE_ADMIN) === "true";
var isLoading = true;

const safetyTips = [
  { title: "Stay Aware", content: "Always be aware of your surroundings. Avoid distractions like headphones when walking alone at night.", category: "personal", icon: "👀" },
  { title: "Emergency Contacts", content: "Save campus security and local emergency numbers in your phone for quick access.", category: "emergency", icon: "📱" },
  { title: "Travel in Groups", content: "Use campus escort services or travel with friends, especially after dark.", category: "personal", icon: "👥" },
  { title: "Secure Your Belongings", content: "Never leave laptops, phones, or bags unattended in libraries or common areas.", category: "campus", icon: "🔒" },
  { title: "Report Suspicious Activity", content: "If you see something unusual, report it immediately to campus security.", category: "campus", icon: "📢" },
  { title: "Strong Passwords", content: "Use unique passwords for different accounts and enable two-factor authentication.", category: "digital", icon: "🔐" },
  { title: "Know Emergency Exits", content: "Locate emergency exits in every building you enter regularly.", category: "emergency", icon: "🚪" },
  { title: "Stay Hydrated", content: "Drink plenty of water and take breaks during exams to maintain focus and health.", category: "health", icon: "💧" }
];

const emergencyContacts = [
  { name: "Campus Security (Alangilan)", phone: "(+63 43) 425-0139 local 2104–2105", desc: "24/7 Campus Security", icon: "👮", rawPhone: "63434250139" },
  { name: "General Campus Hotline", phone: "(+63 43) 425-0139 local 2149", desc: "General Inquiries & Assistance", icon: "📞", rawPhone: "63434250139" },
  { name: "Health Services (Infirmary)", phone: "(+63 43) 779-8400 local 2140", desc: "Medical & Health Services", icon: "🏥", rawPhone: "63437798400" },
  { name: "Local Police", phone: "911", desc: "Emergency Services", icon: "🚔", rawPhone: "911" },
  { name: "National Emergency Hotline", phone: "911", desc: "Nationwide Emergency Response", icon: "🆘", rawPhone: "911" }
];

function escapeHtml(text) {
  if (!text) return '';
  var div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function loadIncidentsFromFirebase() {
  incidentsRef.on("value", function(snapshot) {
    var data = snapshot.val();
    incidents = [];
    if (data) {
      var keys = Object.keys(data);
      for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        var inc = data[key];
        inc.firebaseId = key;
        inc.id = parseInt(key) || Date.now();
        incidents.push(inc);
      }
    }
    renderDashboard();
    renderAdminReports();
    isLoading = false;
  });
}

function saveIncidentToFirebase(incident) {
  var newIncidentRef = incidentsRef.push();
  incident.firebaseId = newIncidentRef.key;
  newIncidentRef.set(incident);
  showToast("Report submitted successfully!");
}

function updateReportStatusInFirebase(id, newStatus) {
  incidentsRef.child(id).update({ status: newStatus });
  showToast("Report status updated to: " + newStatus);
}

function deleteReportFromFirebase(id) {
  if (confirm("Are you sure you want to delete this report? This action cannot be undone.")) {
    incidentsRef.child(id).remove();
    showToast("Report deleted successfully.");
  }
}

function validateUniversityEmail(email) {
  var allowedDomains = ["@g.batstate-u.edu.ph", "@batstate-u.edu.ph"];
  var emailLower = email.toLowerCase();
  
  for(var i = 0; i < allowedDomains.length; i++) {
    if(emailLower.endsWith(allowedDomains[i])) {
      return true;
    }
  }
  return false;
}

var categoryGroup = document.getElementById("categoryGroup");
if (categoryGroup) {
  categoryGroup.addEventListener("click", function (e) {
    var btn = e.target.closest(".btn-option");
    if (!btn) return;
    document.querySelectorAll("#categoryGroup .btn-option").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    selectedCategory = btn.getAttribute("data-value");
  });
}

var urgencyGroup = document.getElementById("urgencyGroup");
if (urgencyGroup) {
  urgencyGroup.addEventListener("click", function (e) {
    var btn = e.target.closest(".urgency-btn");
    if (!btn) return;
    document.querySelectorAll("#urgencyGroup .urgency-btn").forEach(b => {
      b.className = "urgency-btn";
    });
    var val = btn.getAttribute("data-value");
    btn.classList.add("active-" + val);
    selectedUrgency = val;
  });
}

var submitBtn = document.getElementById("submitBtn");
if (submitBtn) {
  submitBtn.addEventListener("click", function() {
    var title = document.getElementById("incTitle").value.trim();
    var desc = document.getElementById("incDesc").value.trim();
    var location = document.getElementById("incLocation").value;
    var customLoc = document.getElementById("incCustomLoc").value.trim();
    var repName = document.getElementById("repName").value.trim();
    var repEmail = document.getElementById("repEmail").value.trim();

    if (!title || !desc || !location) {
      showError("Please fill all required fields (Title, Description, and Location).");
      return;
    }

    if (!repName || !repEmail) {
      showError("Please provide your name and email address.");
      return;
    }

    if (!validateUniversityEmail(repEmail)) {
      showError("Please use your valid Batangas State University email address (@g.batstate-u.edu.ph or @batstate-u.edu.ph)");
      return;
    }

    var finalLocation = location;
    if (location === "Other" && customLoc) {
      finalLocation = customLoc;
    }

    var incident = {
      title: title,
      description: desc,
      category: selectedCategory,
      location: finalLocation,
      urgency: selectedUrgency,
      status: "reported",
      reporterName: repName,
      reporterEmail: repEmail,
      created_at: new Date().toISOString()
    };

    saveIncidentToFirebase(incident);

    document.getElementById("incTitle").value = "";
    document.getElementById("incDesc").value = "";
    document.getElementById("incLocation").value = "";
    document.getElementById("incCustomLoc").value = "";
    document.getElementById("repName").value = "";
    document.getElementById("repEmail").value = "";

    document.getElementById("formContent").style.display = "none";
    document.getElementById("formSuccess").style.display = "block";
  });
}

function showError(message) {
  var errorDiv = document.getElementById("formError");
  if (errorDiv) {
    errorDiv.textContent = message;
    errorDiv.style.display = "block";
    setTimeout(function() {
      errorDiv.style.display = "none";
    }, 5000);
  } else {
    alert(message);
  }
}

function resetForm() {
  document.getElementById("formContent").style.display = "block";
  document.getElementById("formSuccess").style.display = "none";
  document.getElementById("incTitle").value = "";
  document.getElementById("incDesc").value = "";
  document.getElementById("incLocation").value = "";
  document.getElementById("incCustomLoc").value = "";
  document.getElementById("repName").value = "";
  document.getElementById("repEmail").value = "";
}

function renderDashboard() {
  if (isLoading) return;
  
  var total = incidents.length;
  var resolved = incidents.filter(i => i.status === "resolved").length;
  var pending = total - resolved;

  var statTotal = document.getElementById("statTotal");
  var statPending = document.getElementById("statPending");
  var statResolved = document.getElementById("statResolved");
  var recentList = document.getElementById("recentList");

  if (statTotal) statTotal.textContent = total;
  if (statPending) statPending.textContent = pending;
  if (statResolved) statResolved.textContent = resolved;

  if (recentList) {
    if (incidents.length === 0) {
      recentList.innerHTML = '<div class="recent-empty">No incidents have been reported yet. Be the first to help keep campus safe.</div>';
    } else {
      recentList.innerHTML = incidents.slice().reverse().slice(0, 5).map(inc => `
        <div style="border-bottom: 1px solid #e2e8f0; padding: 12px 0;">
          <strong style="color: #0f172a;">${escapeHtml(inc.title)}</strong><br>
          <small style="color: #64748b;">${escapeHtml(inc.location)} | Status: ${getStatusBadge(inc.status)}</small>
          <small style="color: #94a3b8; display: block; margin-top: 4px;">Submitted: ${new Date(inc.created_at).toLocaleDateString()}</small>
        </div>
      `).join("");
    }
  }
}

function getStatusBadge(status) {
  var badges = {
    'reported': '<span style="background:#fef3c7; color:#d97706; padding:2px 8px; border-radius:20px; font-size:11px;">Reported</span>',
    'investigating': '<span style="background:#e0f2fe; color:#0284c7; padding:2px 8px; border-radius:20px; font-size:11px;">Investigating</span>',
    'resolved': '<span style="background:#dcfce7; color:#16a34a; padding:2px 8px; border-radius:20px; font-size:11px;">Resolved</span>'
  };
  return badges[status] || status;
}

function adminLogin() {
  var password = prompt("Enter Admin Password:");
  if (password === "admin123") {
    localStorage.setItem(STORAGE_ADMIN, "true");
    isAdminLoggedIn = true;
    showAdminPanel();
  } else if (password !== null) {
    alert("Incorrect password!");
  }
}

function adminLogout() {
  localStorage.removeItem(STORAGE_ADMIN);
  isAdminLoggedIn = false;
  document.getElementById("adminPanel").style.display = "none";
  document.getElementById("adminLoginBtn").style.display = "inline-flex";
  alert("Logged out of admin mode.");
}

function showAdminPanel() {
  document.getElementById("adminPanel").style.display = "block";
  document.getElementById("adminLoginBtn").style.display = "none";
  renderAdminReports();
}

function renderAdminReports() {
  var container = document.getElementById("adminReportsList");
  if (!container) return;

  var filterStatus = document.getElementById("adminFilterStatus")?.value || "all";
  var searchTerm = document.getElementById("adminSearch")?.value.toLowerCase() || "";

  var filtered = incidents.filter(inc => {
    if (filterStatus !== "all" && inc.status !== filterStatus) return false;
    if (searchTerm && !inc.title.toLowerCase().includes(searchTerm) && 
        !(inc.reporterName && inc.reporterName.toLowerCase().includes(searchTerm)) &&
        !inc.location.toLowerCase().includes(searchTerm)) return false;
    return true;
  });

  if (filtered.length === 0) {
    container.innerHTML = '<div style="text-align:center; padding:40px; color:#94a3b8;">No reports found.</div>';
    return;
  }

  container.innerHTML = filtered.sort((a,b) => new Date(b.created_at) - new Date(a.created_at)).map(inc => `
    <div style="background:white; border:1px solid #e2e8f0; border-radius:12px; padding:16px; margin-bottom:12px;">
      <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:12px; margin-bottom:12px;">
        <div style="flex:1;">
          <h4 style="color:#0f172a; margin-bottom:4px;">${escapeHtml(inc.title)}</h4>
          <div style="display:flex; gap:16px; flex-wrap:wrap; font-size:12px; color:#64748b;">
            <span>📍 ${escapeHtml(inc.location)}</span>
            <span>📅 ${new Date(inc.created_at).toLocaleString()}</span>
            <span>🏷️ ${inc.category}</span>
            <span>⚠️ ${inc.urgency}</span>
          </div>
        </div>
        <div style="display:flex; gap:8px; align-items:center;">
          <select onchange="updateReportStatusInFirebase('${inc.firebaseId}', this.value)" style="padding:6px 10px; border-radius:8px; border:1px solid #e2e8f0; font-size:12px;">
            <option value="reported" ${inc.status === "reported" ? "selected" : ""}>📋 Reported</option>
            <option value="investigating" ${inc.status === "investigating" ? "selected" : ""}>🔍 Investigating</option>
            <option value="resolved" ${inc.status === "resolved" ? "selected" : ""}>✅ Resolved</option>
          </select>
          <button onclick="deleteReportFromFirebase('${inc.firebaseId}')" style="background:#fff1f2; border:1px solid #fecdd3; border-radius:8px; padding:6px 12px; cursor:pointer; color:#e11d48;">🗑️ Delete</button>
        </div>
      </div>
      
      <div style="background:#f8fafc; padding:12px; border-radius:8px; margin-bottom:12px;">
        <p style="font-size:13px; color:#475569;">${escapeHtml(inc.description)}</p>
      </div>
      
      <div style="display:flex; gap:16px; flex-wrap:wrap; font-size:13px; border-top:1px solid #e2e8f0; padding-top:12px; background:#f0fdfa; margin-top:8px; border-radius:8px;">
        <div style="display:flex; align-items:center; gap:6px;">
          <span style="font-size:16px;">👤</span>
          <strong>Reporter:</strong> ${escapeHtml(inc.reporterName || "Not provided")}
        </div>
        <div style="display:flex; align-items:center; gap:6px;">
          <span style="font-size:16px;">📧</span>
          <strong>Email:</strong> ${escapeHtml(inc.reporterEmail || "Not provided")}
        </div>
      </div>
    </div>
  `).join("");
}

function showToast(message) {
  var toast = document.createElement("div");
  toast.textContent = message;
  toast.style.position = "fixed";
  toast.style.bottom = "20px";
  toast.style.right = "20px";
  toast.style.backgroundColor = "#0d9488";
  toast.style.color = "white";
  toast.style.padding = "12px 20px";
  toast.style.borderRadius = "8px";
  toast.style.zIndex = "1000";
  toast.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
  document.body.appendChild(toast);
  setTimeout(function() {
    toast.remove();
  }, 3000);
}

function loadSafetyTips() {
  var grid = document.getElementById("tipsGrid");
  if (!grid) return;
  
  grid.innerHTML = safetyTips.map(tip => `
    <div class="tip-card" data-category="${tip.category}">
      <div class="tip-icon">${tip.icon}</div>
      <div class="tip-title">${tip.title}</div>
      <div class="tip-content">${tip.content}</div>
      <span class="tip-category">${tip.category}</span>
    </div>
  `).join("");
}

function loadEmergencyContacts() {
  var grid = document.getElementById("contactsGrid");
  if (!grid) return;
  
  grid.innerHTML = emergencyContacts.map(contact => `
    <div class="contact-card">
      <div class="contact-top">
        <div class="contact-icon">${contact.icon}</div>
        <div>
          <div class="contact-name">${contact.name}</div>
          <div class="contact-desc">${contact.desc}</div>
        </div>
      </div>
      <div class="contact-bottom">
        <a href="tel:${contact.rawPhone}" class="contact-phone">📞 ${contact.phone}</a>
      </div>
    </div>
  `).join("");
}

var hamburgerBtn = document.getElementById("hamburgerBtn");
if (hamburgerBtn) {
  hamburgerBtn.addEventListener("click", function() {
    var mobileMenu = document.getElementById("mobileMenu");
    if (mobileMenu) mobileMenu.classList.toggle("open");
  });
}

var incLocation = document.getElementById("incLocation");
if (incLocation) {
  incLocation.addEventListener("change", function() {
    var customLocInput = document.getElementById("incCustomLoc");
    if (customLocInput) {
      customLocInput.style.display = this.value === "Other" ? "block" : "none";
    }
  });
}

var adminFilterStatus = document.getElementById("adminFilterStatus");
var adminSearch = document.getElementById("adminSearch");

if (adminFilterStatus) {
  adminFilterStatus.addEventListener("change", renderAdminReports);
}
if (adminSearch) {
  adminSearch.addEventListener("input", renderAdminReports);
}

if (isAdminLoggedIn) {
  showAdminPanel();
}

loadSafetyTips();
loadEmergencyContacts();
loadIncidentsFromFirebase();
