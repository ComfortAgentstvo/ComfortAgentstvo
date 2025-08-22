document.addEventListener("DOMContentLoaded", () => {
  const addBtn = document.getElementById("addBtn");
  const modal = document.getElementById("modal");
  const cancelBtn = document.getElementById("cancelBtn");
  const form = document.getElementById("houseForm");
  const houseList = document.getElementById("houseList");
  const soldList = document.getElementById("soldList");
  const detailModal = document.getElementById("detailModal");
  const detailContent = document.getElementById("detailContent");
  const closeDetail = document.getElementById("closeDetail");
  const trashBtn = document.getElementById("trashBtn");
  const soldModal = document.getElementById("soldModal");
  const closeSold = document.getElementById("closeSold");
  const searchInput = document.getElementById("searchInput");
  const soldSearchInput = document.createElement("input"); // Sotilganlar uchun qidiruv inputi

  let db;
  let editId = null;
  let allHouses = [];
  let allSoldHouses = [];
  let editImages = [];

  // IndexedDB ochish va object store yaratish
  const request = indexedDB.open("RealEstateDB", 1);
  request.onupgradeneeded = (event) => {
    db = event.target.result;
    if (!db.objectStoreNames.contains("houses")) {
      db.createObjectStore("houses", { keyPath: "id", autoIncrement: true });
    }
    if (!db.objectStoreNames.contains("soldHouses")) {
      db.createObjectStore("soldHouses", { keyPath: "id", autoIncrement: true });
    }
    if (!db.objectStoreNames.contains("autosave")) {
      db.createObjectStore("autosave");
    }
  };

  request.onsuccess = (event) => {
    db = event.target.result;
    render();
  };
  request.onerror = (e) => console.error("DB xato:", e);

  // Modal open/close
  addBtn.onclick = () => {
    modal.style.display = "flex";
    loadDraft();
  };
  cancelBtn.onclick = () => {
    modal.style.display = "none";
    form.reset();
    editId = null;
    editImages = [];
    clearDraft();
  };
  closeDetail.onclick = () => { detailModal.style.display = "none"; };
  trashBtn.onclick = () => {
    soldModal.style.display = "flex";
    renderSold();
  };
  closeSold.onclick = () => { soldModal.style.display = "none"; };

  // Forma submit
  form.onsubmit = (e) => {
    e.preventDefault();

    const data = {
      address: document.getElementById("houseAddress").value,
      price: document.getElementById("housePrice").value,
      rooms: document.getElementById("houseRooms").value,
      size: document.getElementById("houseSize").value,
      owner: document.getElementById("houseOwner").value,
      phone: document.getElementById("housePhone").value,
      location: document.getElementById("houseLocation").value || "",
      desc: document.getElementById("houseDesc").value,
      images: []
    };

    const files = document.getElementById("houseImages").files;

    if (files.length === 0 && editImages.length > 0) {
      data.images = editImages.slice();
      saveHouse(data);
    } else if (files.length > 0) {
      let loaded = 0;
      for (let f of files) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          data.images.push(ev.target.result);
          loaded++;
          if (loaded === files.length) {
            saveHouse(data);
          }
        };
        reader.readAsDataURL(f);
      }
    } else {
      saveHouse(data);
    }
  };

  // Uy saqlash yoki tahrirlash
  function saveHouse(data) {
    const tx = db.transaction("houses", "readwrite");
    const store = tx.objectStore("houses");
    if (editId !== null) {
      data.id = editId;
      store.put(data);
      editId = null;
    } else {
      store.add(data);
    }
    tx.oncomplete = () => {
      render();
      modal.style.display = "none";
      form.reset();
      editImages = [];
      clearDraft();
    };
  }

  // Render funksiyasi (uylar ro'yxati)
  function render(filter = "") {
    houseList.innerHTML = "";

    const tx = db.transaction("houses", "readonly");
    const store = tx.objectStore("houses");
    store.getAll().onsuccess = (event) => {
      allHouses = event.target.result;
      let houses = allHouses;

      if (filter.trim() !== "") {
        const f = filter.toLowerCase();
        houses = houses.filter(h =>
          (h.phone && h.phone.toLowerCase().includes(f)) ||
          (h.address && h.address.toLowerCase().includes(f)) ||
          (h.rooms && h.rooms.toString().includes(f)) ||
          (h.owner && h.owner.toLowerCase().includes(f)) ||
          (h.price && h.price.toString().includes(f)) ||
          (h.desc && h.desc.toLowerCase().includes(f))
        );
      }

      houses.forEach((h) => {
        const card = document.createElement("div");
        card.className = "card";
        card.innerHTML = `
          <h3>${h.rooms} xonali uy</h3>
          <div class="info">📞 ${h.phone}</div>
          <div class="info">📍 ${h.address}</div>
          <div class="actions">
            <button onclick="showDetail(${h.id}, false)">Ko‘rish</button>
            <button class="btn-secondary" onclick="editHouse(${h.id})">✏️</button>
            <button class="btn-danger" onclick="deleteHouse(${h.id})">🗑️</button>
            <button class="btn-secondary" onclick="sellHouse(${h.id})">Sotildi</button>
          </div>
        `;
        houseList.appendChild(card);
      });
    };
  }

  // Sotilgan uylarni render qilish (modal ichida)
  function renderSold(filter = "") {
    soldList.innerHTML = "";

    const tx = db.transaction("soldHouses", "readonly");
    const store = tx.objectStore("soldHouses");
    store.getAll().onsuccess = (event) => {
      allSoldHouses = event.target.result;
      let houses = allSoldHouses;

      if (filter.trim() !== "") {
        const f = filter.toLowerCase();
        houses = houses.filter(h =>
          (h.phone && h.phone.toLowerCase().includes(f)) ||
          (h.address && h.address.toLowerCase().includes(f)) ||
          (h.rooms && h.rooms.toString().includes(f)) ||
          (h.owner && h.owner.toLowerCase().includes(f)) ||
          (h.price && h.price.toString().includes(f)) ||
          (h.desc && h.desc.toLowerCase().includes(f))
        );
      }

      houses.forEach((h) => {
        const card = document.createElement("div");
        card.className = "card";
        card.innerHTML = `
          <h3>${h.rooms} xonali uy</h3>
          <div class="info">📞 ${h.phone}</div>
          <div class="info">📍 ${h.address}</div>
          <div class="actions">
            <button onclick="showDetail(${h.id}, true)">Ko‘rish</button>
            <button class="btn-danger" onclick="deleteSoldHouse(${h.id})">🗑️</button>
          </div>
        `;
        soldList.appendChild(card);
      });

      if (!document.getElementById("soldSearchInput")) {
        soldSearchInput.id = "soldSearchInput";
        soldSearchInput.placeholder = "Sotilgan uylar ichida qidirish...";
        soldSearchInput.style.marginBottom = "10px";
        soldSearchInput.style.width = "100%";
        soldSearchInput.addEventListener("input", e => {
          renderSold(e.target.value);
        });
        soldList.parentNode.insertBefore(soldSearchInput, soldList);
      }
    };
  }

  // Qidiruv uylar ro'yxati uchun
  searchInput.addEventListener("input", (e) => {
    render(e.target.value);
  });

  // Batafsil (Ko‘rish) funksiyasi
  window.showDetail = function(id, isSold = false) {
    let house = null;
    if (isSold) {
      house = allSoldHouses.find(x => x.id === id);
    } else {
      house = allHouses.find(x => x.id === id);
    }
    if (!house) return;

    detailContent.innerHTML = `
      <h2>${house.rooms} xonali uy</h2>
      <p><b>Manzil:</b> ${house.address}</p>
      <p><b>Narxi:</b> $${house.price}</p>
      <p><b>Maydon:</b> ${house.size} m²</p>
      <p><b>Egasining ismi:</b> ${house.owner}</p>
      <p><b>Telefon:</b> ${house.phone}</p>
      ${house.location ? `<p><a href="${house.location}" target="_blank">📍 Lokatsiya</a></p>` : ""}
      <p><b>Tavsif:</b> ${house.desc}</p>
      <div class="detail-images">
        ${house.images && house.images.length > 0 ? house.images.map(img => `<img src="${img}" style="max-width:100px; margin: 5px;">`).join("") : "<p>Rasm mavjud emas</p>"}
      </div>
    `;
    detailModal.style.display = "flex";
  };

  // Edit (tahrirlash)
  window.editHouse = function(id) {
    const h = allHouses.find(x => x.id === id);
    if (!h) return;

    document.getElementById("houseAddress").value = h.address;
    document.getElementById("housePrice").value = h.price;
    document.getElementById("houseRooms").value = h.rooms;
    document.getElementById("houseSize").value = h.size;
    document.getElementById("houseOwner").value = h.owner;
    document.getElementById("housePhone").value = h.phone;
    document.getElementById("houseLocation").value = h.location;
    document.getElementById("houseDesc").value = h.desc;

    editImages = h.images ? h.images.slice() : [];

    editId = id;
    modal.style.display = "flex";
  };

  // Delete uylar ro'yxatidan
  window.deleteHouse = function(id) {
    if (confirm("Haqiqatan o‘chirilsinmi?")) {
      const tx = db.transaction("houses", "readwrite");
      tx.objectStore("houses").delete(id);
      tx.oncomplete = () => render();
    }
  };

  // Delete sotilgan uylar ro'yxatidan
  window.deleteSoldHouse = function(id) {
    if (confirm("Sotilgan uy o‘chirilsinmi?")) {
      const tx = db.transaction("soldHouses", "readwrite");
      tx.objectStore("soldHouses").delete(id);
      tx.oncomplete = () => renderSold();
    }
  };

  // Sotildi holatiga o'tkazish
  window.sellHouse = function(id) {
    if (confirm("Bu uy sotildimi?")) {
      const tx = db.transaction(["houses", "soldHouses"], "readwrite");
      const store = tx.objectStore("houses");
      const soldStore = tx.objectStore("soldHouses");

      store.get(id).onsuccess = (e) => {
        const data = e.target.result;
        soldStore.add(data).onsuccess = () => {
          store.delete(id).onsuccess = () => render();
        };
      };
    }
  };

  // Draft (avto saqlash)
  document.querySelectorAll("#houseForm input:not(#houseImages), #houseForm textarea").forEach(input => {
    input.addEventListener("input", saveDraft);
  });

  function saveDraft() {
    if (!db) return;
    const draft = {
      address: document.getElementById("houseAddress").value,
      price: document.getElementById("housePrice").value,
      rooms: document.getElementById("houseRooms").value,
      size: document.getElementById("houseSize").value,
      owner: document.getElementById("houseOwner").value,
      phone: document.getElementById("housePhone").value,
      location: document.getElementById("houseLocation").value,
      desc: document.getElementById("houseDesc").value,
    };

    const tx = db.transaction("autosave", "readwrite");
    const store = tx.objectStore("autosave");
    store.put(draft, "draft");
  }

  function loadDraft() {
    if (!db) return;
    const tx = db.transaction("autosave", "readonly");
    const store = tx.objectStore("autosave");
    store.get("draft").onsuccess = (e) => {
      const draft = e.target.result;
      if (draft) {
        document.getElementById("houseAddress").value = draft.address || "";
        document.getElementById("housePrice").value = draft.price || "";
        document.getElementById("houseRooms").value = draft.rooms || "";
        document.getElementById("houseSize").value = draft.size || "";
        document.getElementById("houseOwner").value = draft.owner || "";
        document.getElementById("housePhone").value = draft.phone || "";
        document.getElementById("houseLocation").value = draft.location || "";
        document.getElementById("houseDesc").value = draft.desc || "";
      }
    };
  }

  function clearDraft() {
    if (!db) return;
    const tx = db.transaction("autosave", "readwrite");
    tx.objectStore("autosave").delete("draft");
  }

});
