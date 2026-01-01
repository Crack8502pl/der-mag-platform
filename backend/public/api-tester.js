// Konfiguracja API
const API_URL = (window.location.origin || 'http://localhost:3000') + '/api';
console.log('🔗 API URL:', API_URL);

// Globalne zmienne
let authToken = localStorage.getItem('authToken') || null;

// Funkcja do wykonywania requestów API
async function apiRequest(endpoint, method = 'GET', body = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json'
    }
  };

  // Dodaj token autoryzacyjny
  const token = localStorage.getItem('authToken') || authToken;
  if (token) {
    options.headers['Authorization'] = `Bearer ${token}`;
  }

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    console.log(`🌐 ${method} ${API_URL}${endpoint}`);
    const response = await fetch(API_URL + endpoint, options);
    const data = await response.json();
    
    return {
      ok: response.ok,
      status: response.status,
      data: data
    };
  } catch (error) {
    console.error('❌ API Request Error:', error);
    return {
      ok: false,
      status: 0,
      data: { success: false, message: 'Błąd połączenia: ' + error.message }
    };
  }
}

// Wyświetlanie odpowiedzi
function displayResponse(elementId, data, status) {
  const element = document.getElementById(elementId);
  element.style.display = 'block';
  
  let statusBadge = '';
  if (status >= 200 && status < 300) {
    statusBadge = '<span class="badge success">✓ ' + status + '</span>';
  } else if (status >= 400) {
    statusBadge = '<span class="badge error">✗ ' + status + '</span>';
  } else {
    statusBadge = '<span class="badge info">ⓘ ' + status + '</span>';
  }
  
  element.innerHTML = statusBadge + '<pre>' + JSON.stringify(data, null, 2) + '</pre>';
}

// Aktualizacja statusu autoryzacji
function updateAuthStatus() {
  const authStatus = document.getElementById('authStatus');
  const authStatusText = document.getElementById('authStatusText');
  const tokenDisplay = document.getElementById('tokenDisplay');

  if (authToken) {
    authStatus.classList.add('logged-in');
    authStatusText.innerHTML = '<span class="badge success">✓ Zalogowano</span>';
    tokenDisplay.innerHTML = '<strong>Token JWT:</strong><div class="token-display">' + authToken.substring(0, 50) + '...</div>';
  } else {
    authStatus.classList.remove('logged-in');
    authStatusText.innerHTML = '<span class="badge error">✗ Nie zalogowano</span>';
    tokenDisplay.innerHTML = '<strong>Token JWT:</strong><div class="token-display">Brak tokenu</div>';
  }
}

// Toggle password visibility
function togglePassword(inputId) {
  const input = document.getElementById(inputId);
  const toggles = document.querySelectorAll(`.password-toggle[data-target="${inputId}"]`);
  
  if (input.type === 'password') {
    input.type = 'text';
    toggles.forEach(toggle => toggle.textContent = '🙈');
  } else {
    input.type = 'password';
    toggles.forEach(toggle => toggle.textContent = '👁️');
  }
}

// Nawigacja
function showSection(sectionId) {
  document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  
  // Find and activate the nav item for this section
  document.querySelectorAll('.nav-item').forEach(item => {
    if (item.getAttribute('data-section') === sectionId) {
      item.classList.add('active');
    }
  });
  document.getElementById(sectionId).classList.add('active');
}

// ============================================
// AUTORYZACJA
// ============================================

async function login() {
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;

  if (!username || !password) {
    alert('Wprowadź nazwę użytkownika i hasło');
    return;
  }

  const result = await apiRequest('/auth/login', 'POST', { username, password });

  if (result.ok && result.data.success && result.data.data && result.data.data.accessToken) {
    authToken = result.data.data.accessToken;
    localStorage.setItem('authToken', authToken);
    
    if (result.data.data.user) {
      localStorage.setItem('user', JSON.stringify(result.data.data.user));
    }

    updateAuthStatus();
    displayResponse('loginResponse', result.data, result.status);
    alert('✅ ' + result.data.message);
  } else {
    displayResponse('loginResponse', result.data, result.status);
    alert('❌ Błąd logowania: ' + (result.data.message || 'Nieznany błąd'));
  }
}

function logout() {
  authToken = null;
  localStorage.removeItem('authToken');
  localStorage.removeItem('user');
  updateAuthStatus();
  alert('Wylogowano');
}

async function getMe() {
  const result = await apiRequest('/auth/me', 'GET');
  displayResponse('meResponse', result.data, result.status);
}

// ============================================
// UŻYTKOWNICY
// ============================================

async function getUsers() {
  const result = await apiRequest('/users', 'GET');
  displayResponse('usersResponse', result.data, result.status);
  
  if (result.ok && result.data.success && result.data.data) {
    displayUsersList(result.data.data);
  }
}

function displayUsersList(users) {
  const listElement = document.getElementById('usersList');
  listElement.innerHTML = '';
  
  users.forEach(user => {
    const userDiv = document.createElement('div');
    userDiv.className = 'user-item';
    userDiv.innerHTML = `
      <div class="user-info">
        <strong>${user.firstName} ${user.lastName}</strong> (@${user.username})
        <br><small>${user.email} | Rola: ${user.role?.name || 'Brak'}</small>
      </div>
      <div class="user-actions">
        <button class="secondary edit-user-btn" data-user-id="${user.id}">Edytuj</button>
      </div>
    `;
    listElement.appendChild(userDiv);
  });
}

async function createUser() {
  const username = document.getElementById('newUsername').value;
  const email = document.getElementById('newEmail').value;
  const password = document.getElementById('newPassword').value;
  const firstName = document.getElementById('newFirstName').value;
  const lastName = document.getElementById('newLastName').value;
  const roleId = parseInt(document.getElementById('newRoleId').value);

  if (!username || !email || !password || !firstName || !lastName) {
    alert('Wypełnij wszystkie pola');
    return;
  }

  const result = await apiRequest('/users', 'POST', {
    username,
    email,
    password,
    firstName,
    lastName,
    roleId
  });

  displayResponse('createUserResponse', result.data, result.status);
  
  if (result.ok) {
    alert('✅ Użytkownik utworzony');
    document.getElementById('newUsername').value = '';
    document.getElementById('newEmail').value = '';
    document.getElementById('newPassword').value = '';
    document.getElementById('newFirstName').value = '';
    document.getElementById('newLastName').value = '';
    getUsers();
  }
}

async function editUser(userId) {
  const result = await apiRequest('/users', 'GET');
  if (result.ok && result.data.success) {
    const user = result.data.data.find(u => u.id === userId);
    if (user) {
      document.getElementById('editUserId').value = user.id;
      document.getElementById('editUsername').value = user.username;
      document.getElementById('editEmail').value = user.email;
      document.getElementById('editFirstName').value = user.firstName;
      document.getElementById('editLastName').value = user.lastName;
      document.getElementById('editUserCard').classList.remove('hidden');
      document.getElementById('editUserCard').scrollIntoView({ behavior: 'smooth' });
    }
  }
}

async function updateUser() {
  const userId = document.getElementById('editUserId').value;
  const username = document.getElementById('editUsername').value;
  const email = document.getElementById('editEmail').value;
  const firstName = document.getElementById('editFirstName').value;
  const lastName = document.getElementById('editLastName').value;

  const result = await apiRequest('/users/' + userId, 'PUT', {
    username,
    email,
    firstName,
    lastName
  });

  displayResponse('editUserResponse', result.data, result.status);
  
  if (result.ok) {
    alert('✅ Użytkownik zaktualizowany');
    cancelEditUser();
    getUsers();
  }
}

function cancelEditUser() {
  document.getElementById('editUserCard').classList.add('hidden');
}

async function checkUsersInDB() {
  const result = await apiRequest('/users', 'GET');
  if (result.ok && result.data.success) {
    alert('✅ Użytkowników w bazie: ' + result.data.data.length);
    displayResponse('usersResponse', result.data, result.status);
  } else {
    alert('❌ Błąd pobierania użytkowników');
  }
}

// ============================================
// ZADANIA
// ============================================

async function getTasks() {
  const result = await apiRequest('/tasks', 'GET');
  displayResponse('tasksResponse', result.data, result.status);
}

async function createTask() {
  const title = document.getElementById('taskTitle').value;
  const description = document.getElementById('taskDescription').value;
  const taskTypeId = parseInt(document.getElementById('taskTypeId').value);

  if (!title || !description) {
    alert('Wypełnij tytuł i opis');
    return;
  }

  const result = await apiRequest('/tasks', 'POST', {
    title,
    description,
    taskTypeId
  });

  displayResponse('createTaskResponse', result.data, result.status);
  
  if (result.ok) {
    alert('✅ Zadanie utworzone');
    document.getElementById('taskTitle').value = '';
    document.getElementById('taskDescription').value = '';
    getTasks();
  }
}

async function checkTasksInDB() {
  const result = await apiRequest('/tasks', 'GET');
  if (result.ok && result.data.success) {
    alert('✅ Zadań w bazie: ' + result.data.data.length);
    displayResponse('tasksResponse', result.data, result.status);
  } else {
    alert('❌ Błąd pobierania zadań');
  }
}

// ============================================
// URZĄDZENIA
// ============================================

async function getDevices() {
  const result = await apiRequest('/devices', 'GET');
  displayResponse('devicesResponse', result.data, result.status);
}

async function createDevice() {
  const serialNumber = document.getElementById('deviceSerial').value;
  const model = document.getElementById('deviceModel').value;
  const macAddress = document.getElementById('deviceMac').value;

  if (!serialNumber || !model) {
    alert('Wypełnij numer seryjny i model');
    return;
  }

  const result = await apiRequest('/devices', 'POST', {
    serialNumber,
    model,
    macAddress
  });

  displayResponse('createDeviceResponse', result.data, result.status);
  
  if (result.ok) {
    alert('✅ Urządzenie utworzone');
    document.getElementById('deviceSerial').value = '';
    document.getElementById('deviceModel').value = '';
    document.getElementById('deviceMac').value = '';
    getDevices();
  }
}

async function checkDevicesInDB() {
  const result = await apiRequest('/devices', 'GET');
  if (result.ok && result.data.success) {
    alert('✅ Urządzeń w bazie: ' + result.data.data.length);
    displayResponse('devicesResponse', result.data, result.status);
  } else {
    alert('❌ Błąd pobierania urządzeń');
  }
}

// ============================================
// EMAIL
// ============================================

async function checkEmailConfig() {
  const result = await apiRequest('/notifications/config', 'GET');
  displayResponse('emailConfigResponse', result.data, result.status);
}

async function testSmtp() {
  const result = await apiRequest('/notifications/test-connection', 'POST');
  displayResponse('emailConfigResponse', result.data, result.status);
  
  if (result.ok && result.data.success) {
    alert('✅ Połączenie SMTP działa poprawnie!');
  } else {
    alert('❌ Błąd połączenia SMTP');
  }
}

async function sendTestEmail() {
  const to = document.getElementById('testEmailTo').value;

  if (!to) {
    alert('Wprowadź adres email');
    return;
  }

  const result = await apiRequest('/notifications/test', 'POST', { to });
  displayResponse('testEmailResponse', result.data, result.status);
  
  if (result.ok) {
    alert('✅ Email testowy wysłany do: ' + to);
  }
}

async function getQueueStats() {
  const result = await apiRequest('/notifications/queue/stats', 'GET');
  displayResponse('queueStatsResponse', result.data, result.status);
  
  if (result.ok && result.data.success && result.data.data) {
    const stats = result.data.data;
    document.getElementById('statWaiting').textContent = stats.waiting || 0;
    document.getElementById('statActive').textContent = stats.active || 0;
    document.getElementById('statCompleted').textContent = stats.completed || 0;
    document.getElementById('statFailed').textContent = stats.failed || 0;
    document.getElementById('queueStatsGrid').style.display = 'grid';
  }
}

// ============================================
// BAZA DANYCH
// ============================================

async function clearUsers() {
  if (!confirm('Czy na pewno chcesz usunąć wszystkich użytkowników (oprócz admin)? Ta operacja jest nieodwracalna!')) {
    return;
  }

  // Ta funkcja wymaga specjalnego endpointu - do implementacji
  alert('⚠️ Funkcja do implementacji na backendzie');
  displayResponse('dbResponse', { message: 'Wymaga endpointu /api/admin/clear-users' }, 200);
}

async function clearTasks() {
  if (!confirm('Czy na pewno chcesz usunąć wszystkie zadania? Ta operacja jest nieodwracalna!')) {
    return;
  }

  alert('⚠️ Funkcja do implementacji na backendzie');
  displayResponse('dbResponse', { message: 'Wymaga endpointu /api/admin/clear-tasks' }, 200);
}

async function clearDevices() {
  if (!confirm('Czy na pewno chcesz usunąć wszystkie urządzenia? Ta operacja jest nieodwracalna!')) {
    return;
  }

  alert('⚠️ Funkcja do implementacji na backendzie');
  displayResponse('dbResponse', { message: 'Wymaga endpointu /api/admin/clear-devices' }, 200);
}

async function clearEmailQueue() {
  if (!confirm('Czy na pewno chcesz wyczyścić kolejkę emaili?')) {
    return;
  }

  const result = await apiRequest('/notifications/queue/clean', 'POST');
  displayResponse('dbResponse', result.data, result.status);
  
  if (result.ok) {
    alert('✅ Kolejka emaili wyczyszczona');
  }
}

async function getDBStats() {
  const users = await apiRequest('/users', 'GET');
  const tasks = await apiRequest('/tasks', 'GET');
  const devices = await apiRequest('/devices', 'GET');

  const stats = {
    users: users.ok && users.data.success ? users.data.data.length : 0,
    tasks: tasks.ok && tasks.data.success ? tasks.data.data.length : 0,
    devices: devices.ok && devices.data.success ? devices.data.data.length : 0,
  };

  displayResponse('dbStatsResponse', stats, 200);
}

// ============================================
// DOCUMENTS
// ============================================

async function uploadDocument() {
  const file = document.getElementById('docFile').files[0];
  if (!file) {
    alert('Wybierz plik do uploadu');
    return;
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('name', document.getElementById('docName').value);
  formData.append('description', document.getElementById('docDescription').value);
  formData.append('category', document.getElementById('docCategory').value);
  const taskId = document.getElementById('docTaskId').value;
  if (taskId) formData.append('taskId', taskId);

  const result = await apiRequest('/documents/upload', 'POST', formData, true);
  displayResponse('uploadDocResponse', result.data, result.status);
  
  if (result.ok) {
    alert('✅ Dokument przesłany pomyślnie');
    document.getElementById('docFile').value = '';
  }
}

async function getDocuments() {
  const category = document.getElementById('filterDocCategory').value;
  const url = category ? `/documents?category=${category}` : '/documents';
  
  const result = await apiRequest(url, 'GET');
  displayResponse('documentsResponse', result.data, result.status);
}

async function getDocument() {
  const id = document.getElementById('documentId').value;
  if (!id) {
    alert('Wprowadź ID dokumentu');
    return;
  }

  const result = await apiRequest(`/documents/${id}`, 'GET');
  displayResponse('documentResponse', result.data, result.status);
}

async function downloadDocument() {
  const id = document.getElementById('documentId').value;
  if (!id) {
    alert('Wprowadź ID dokumentu');
    return;
  }

  window.open(`${API_URL}/documents/${id}/download`, '_blank');
}

async function deleteDocument() {
  const id = document.getElementById('documentId').value;
  if (!id) {
    alert('Wprowadź ID dokumentu');
    return;
  }

  if (!confirm('Czy na pewno chcesz usunąć ten dokument?')) {
    return;
  }

  const result = await apiRequest(`/documents/${id}`, 'DELETE');
  displayResponse('documentResponse', result.data, result.status);
  
  if (result.ok) {
    alert('✅ Dokument usunięty');
  }
}

// ============================================
// TEMPLATES
// ============================================

async function uploadTemplate() {
  const file = document.getElementById('templateFile').files[0];
  if (!file) {
    alert('Wybierz plik szablonu');
    return;
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('name', document.getElementById('templateName').value);
  formData.append('description', document.getElementById('templateDescription').value);
  
  const taskTypeId = document.getElementById('templateTaskType').value;
  if (taskTypeId) formData.append('taskTypeId', taskTypeId);

  const placeholders = document.getElementById('templatePlaceholders').value;
  if (placeholders) {
    try {
      formData.append('placeholders', placeholders);
    } catch (e) {
      alert('Nieprawidłowy format JSON dla placeholderów');
      return;
    }
  }

  const result = await apiRequest('/bom-builder/templates', 'POST', formData, true);
  displayResponse('uploadTemplateResponse', result.data, result.status);
  
  if (result.ok) {
    alert('✅ Szablon przesłany pomyślnie');
    document.getElementById('templateFile').value = '';
  }
}

async function getTemplates() {
  const result = await apiRequest('/bom-builder/templates', 'GET');
  displayResponse('templatesResponse', result.data, result.status);
}

async function generateDocument() {
  const templateId = document.getElementById('generateTemplateId').value;
  const documentName = document.getElementById('generateDocName').value;
  const dataStr = document.getElementById('generateData').value;

  if (!templateId || !documentName || !dataStr) {
    alert('Wypełnij wszystkie wymagane pola');
    return;
  }

  let data;
  try {
    data = JSON.parse(dataStr);
  } catch (e) {
    alert('Nieprawidłowy format JSON dla danych');
    return;
  }

  const body = {
    documentName,
    data,
    taskId: document.getElementById('generateTaskId').value || undefined
  };

  const result = await apiRequest(`/bom-builder/templates/${templateId}/generate`, 'POST', body);
  displayResponse('generateDocResponse', result.data, result.status);
  
  if (result.ok) {
    alert('✅ Dokument wygenerowany pomyślnie');
  }
}

// ============================================
// CSV IMPORT
// ============================================

async function uploadCSV() {
  const file = document.getElementById('csvFile').files[0];
  if (!file) {
    alert('Wybierz plik CSV');
    return;
  }

  const formData = new FormData();
  formData.append('file', file);

  const result = await apiRequest('/import/materials/csv', 'POST', formData, true);
  displayResponse('uploadCSVResponse', result.data, result.status);
  
  if (result.ok && result.data.success) {
    const data = result.data.data;
    document.getElementById('importUuid').value = data.uuid;
    document.getElementById('csvTotalRows').textContent = data.totalRows;
    document.getElementById('csvNewItems').textContent = data.newItems;
    document.getElementById('csvExistingItems').textContent = data.existingItems;
    document.getElementById('csvErrorItems').textContent = data.errorItems;
    
    // Wyświetl preview
    let previewHtml = '';
    
    if (data.preview.new && data.preview.new.length > 0) {
      previewHtml += '<h4 style="color: #4299e1; margin-top: 16px;">🆕 Nowe materiały (' + data.preview.new.length + '):</h4>';
      previewHtml += '<div style="max-height: 200px; overflow-y: auto; background: #f7fafc; padding: 12px; border-radius: 6px;">';
      data.preview.new.forEach(item => {
        previewHtml += `<div style="margin-bottom: 8px; padding: 8px; background: white; border-radius: 4px;">
          <strong>${item.catalog_number}</strong> - ${item.name} (${item.unit})
          ${item.category ? ` | Kategoria: ${item.category}` : ''}
          ${item.supplier ? ` | Dostawca: ${item.supplier}` : ''}
        </div>`;
      });
      previewHtml += '</div>';
    }

    if (data.preview.existing && data.preview.existing.length > 0) {
      previewHtml += '<h4 style="color: #ed8936; margin-top: 16px;">⚠️ Istniejące materiały (pominięte, ' + data.preview.existing.length + '):</h4>';
      previewHtml += '<div style="max-height: 150px; overflow-y: auto; background: #f7fafc; padding: 12px; border-radius: 6px;">';
      data.preview.existing.slice(0, 5).forEach(item => {
        previewHtml += `<div style="margin-bottom: 4px;">${item.catalog_number} - ${item.name}</div>`;
      });
      if (data.preview.existing.length > 5) {
        previewHtml += `<div style="margin-top: 8px; font-style: italic;">... i ${data.preview.existing.length - 5} więcej</div>`;
      }
      previewHtml += '</div>';
    }

    if (data.preview.errors && data.preview.errors.length > 0) {
      previewHtml += '<h4 style="color: #f56565; margin-top: 16px;">❌ Błędy (' + data.preview.errors.length + '):</h4>';
      previewHtml += '<div style="max-height: 150px; overflow-y: auto; background: #fff5f5; padding: 12px; border-radius: 6px;">';
      data.preview.errors.forEach(err => {
        previewHtml += `<div style="margin-bottom: 8px; padding: 8px; background: white; border-radius: 4px;">
          <strong>Wiersz ${err.row}:</strong> ${err.error}
        </div>`;
      });
      previewHtml += '</div>';
    }

    document.getElementById('csvPreviewContent').innerHTML = previewHtml;
    document.getElementById('csvPreviewCard').style.display = 'block';
    document.getElementById('csvFile').value = '';
  }
}

async function confirmImport() {
  const uuid = document.getElementById('importUuid').value;
  if (!uuid) {
    alert('Brak UUID importu');
    return;
  }

  const result = await apiRequest(`/import/materials/${uuid}/confirm`, 'POST');
  displayResponse('confirmImportResponse', result.data, result.status);
  
  if (result.ok) {
    alert('✅ Import zakończony pomyślnie');
    document.getElementById('csvPreviewCard').style.display = 'none';
  }
}

async function cancelImport() {
  const uuid = document.getElementById('importUuid').value;
  if (!uuid) {
    alert('Brak UUID importu');
    return;
  }

  if (!confirm('Czy na pewno chcesz anulować import?')) {
    return;
  }

  const result = await apiRequest(`/import/materials/${uuid}`, 'DELETE');
  displayResponse('confirmImportResponse', result.data, result.status);
  
  if (result.ok) {
    alert('Import anulowany');
    document.getElementById('csvPreviewCard').style.display = 'none';
  }
}

async function downloadCSVTemplate() {
  window.open(`${API_URL}/import/materials/template`, '_blank');
}

async function getImportHistory() {
  const result = await apiRequest('/import/history', 'GET');
  displayResponse('importHistoryResponse', result.data, result.status);
}

// ============================================
// BOM BUILDER
// ============================================

async function getMaterials() {
  const search = document.getElementById('materialsSearch').value;
  const category = document.getElementById('materialsCategory').value;
  
  let url = '/bom-builder/materials?';
  if (search) url += `search=${encodeURIComponent(search)}&`;
  if (category) url += `category=${encodeURIComponent(category)}&`;
  
  const result = await apiRequest(url, 'GET');
  displayResponse('materialsResponse', result.data, result.status);
}

async function getCategories() {
  const result = await apiRequest('/bom-builder/categories', 'GET');
  displayResponse('materialsResponse', result.data, result.status);
}

async function getTaskTypeBOM() {
  const taskTypeId = document.getElementById('bomTaskTypeId').value;
  if (!taskTypeId) {
    alert('Wprowadź ID typu zadania');
    return;
  }

  const result = await apiRequest(`/bom-builder/task-type/${taskTypeId}`, 'GET');
  displayResponse('taskTypeBOMResponse', result.data, result.status);
}

async function createMaterial() {
  const body = {
    taskTypeId: parseInt(document.getElementById('materialTaskTypeId').value),
    materialName: document.getElementById('materialName').value,
    catalogNumber: document.getElementById('materialCatalogNumber').value,
    unit: document.getElementById('materialUnit').value,
    defaultQuantity: parseFloat(document.getElementById('materialQuantity').value) || 1,
    category: document.getElementById('materialCategory').value,
    supplier: document.getElementById('materialSupplier').value,
    unitPrice: parseFloat(document.getElementById('materialUnitPrice').value) || undefined
  };

  if (!body.materialName || !body.unit) {
    alert('Wypełnij wymagane pola (nazwa i jednostka)');
    return;
  }

  const result = await apiRequest('/bom-builder/items', 'POST', body);
  displayResponse('createMaterialResponse', result.data, result.status);
  
  if (result.ok) {
    alert('✅ Materiał dodany pomyślnie');
    // Wyczyść formularz
    document.getElementById('materialName').value = '';
    document.getElementById('materialCatalogNumber').value = '';
    document.getElementById('materialCategory').value = '';
    document.getElementById('materialSupplier').value = '';
    document.getElementById('materialUnitPrice').value = '';
  }
}

async function copyBOMTemplate() {
  const sourceId = document.getElementById('sourceTaskTypeId').value;
  const targetId = document.getElementById('targetTaskTypeId').value;

  if (!sourceId || !targetId) {
    alert('Wypełnij oba pola ID');
    return;
  }

  const result = await apiRequest(`/bom-builder/task-type/${sourceId}/copy/${targetId}`, 'POST');
  displayResponse('copyBOMResponse', result.data, result.status);
  
  if (result.ok) {
    alert('✅ Szablon skopiowany pomyślnie');
  }
}

// ============================================
// BOM TRIGGERS
// ============================================

async function listBomTriggers() {
  const isActive = document.getElementById('triggerFilterActive').value;
  let endpoint = '/bom-triggers';
  
  if (isActive) {
    endpoint += `?isActive=${isActive}`;
  }

  const result = await apiRequest(endpoint, 'GET');
  displayResponse('listTriggersResponse', result.data, result.status);
}

async function getBomTrigger() {
  const id = document.getElementById('getTriggerById').value;
  
  if (!id) {
    alert('Podaj ID triggera');
    return;
  }

  const result = await apiRequest(`/bom-triggers/${id}`, 'GET');
  displayResponse('getTriggerResponse', result.data, result.status);
}

async function createBomTrigger() {
  const name = document.getElementById('triggerName').value;
  const description = document.getElementById('triggerDescription').value;
  const triggerEvent = document.getElementById('triggerEvent').value;
  const triggerCondition = document.getElementById('triggerCondition').value;
  const actionType = document.getElementById('triggerActionType').value;
  const actionConfig = document.getElementById('triggerActionConfig').value;
  const priority = document.getElementById('triggerPriority').value;

  if (!name || !triggerEvent || !actionType) {
    alert('Wypełnij wymagane pola (nazwa, event, akcja)');
    return;
  }

  let parsedCondition, parsedConfig;
  
  try {
    parsedCondition = JSON.parse(triggerCondition);
    parsedConfig = JSON.parse(actionConfig);
  } catch (error) {
    alert('Błąd parsowania JSON: ' + error.message);
    return;
  }

  const body = {
    name,
    description: description || undefined,
    triggerEvent,
    triggerCondition: parsedCondition,
    actionType,
    actionConfig: parsedConfig,
    priority: parseInt(priority),
    isActive: true
  };

  const result = await apiRequest('/bom-triggers', 'POST', body);
  displayResponse('createTriggerResponse', result.data, result.status);
  
  if (result.ok) {
    alert('✅ Trigger utworzony pomyślnie');
    // Wyczyść formularz
    document.getElementById('triggerName').value = '';
    document.getElementById('triggerDescription').value = '';
  }
}

async function toggleBomTrigger() {
  const id = document.getElementById('toggleTriggerId').value;
  
  if (!id) {
    alert('Podaj ID triggera');
    return;
  }

  const result = await apiRequest(`/bom-triggers/${id}/toggle`, 'POST');
  displayResponse('toggleTriggerResponse', result.data, result.status);
  
  if (result.ok) {
    alert('✅ Status triggera zmieniony');
  }
}

async function testBomTrigger() {
  const id = document.getElementById('testTriggerId').value;
  const testData = document.getElementById('testTriggerData').value;
  
  if (!id) {
    alert('Podaj ID triggera');
    return;
  }

  let parsedData;
  try {
    parsedData = JSON.parse(testData);
  } catch (error) {
    alert('Błąd parsowania JSON: ' + error.message);
    return;
  }

  const result = await apiRequest(`/bom-triggers/${id}/test`, 'POST', { testData: parsedData });
  displayResponse('testTriggerResponse', result.data, result.status);
}

async function getBomTriggerLogs() {
  const id = document.getElementById('triggerLogsId').value;
  
  if (!id) {
    alert('Podaj ID triggera');
    return;
  }

  const result = await apiRequest(`/bom-triggers/${id}/logs`, 'GET');
  displayResponse('triggerLogsResponse', result.data, result.status);
}

async function getBomTriggerEvents() {
  const result = await apiRequest('/bom-triggers/events', 'GET');
  displayResponse('triggerEventsResponse', result.data, result.status);
}

async function getBomTriggerActions() {
  const result = await apiRequest('/bom-triggers/actions', 'GET');
  displayResponse('triggerActionsResponse', result.data, result.status);
}

async function deleteBomTrigger() {
  const id = document.getElementById('deleteTriggerId').value;
  
  if (!id) {
    alert('Podaj ID triggera');
    return;
  }

  if (!confirm('Czy na pewno chcesz usunąć ten trigger?')) {
    return;
  }

  const result = await apiRequest(`/bom-triggers/${id}`, 'DELETE');
  displayResponse('deleteTriggerResponse', result.data, result.status);
  
  if (result.ok) {
    alert('✅ Trigger usunięty');
    document.getElementById('deleteTriggerId').value = '';
  }
}

// ============================================
// EVENT LISTENERS INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', function() {
  // Navigation
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', function() {
      const section = this.getAttribute('data-section');
      if (section) showSection(section);
    });
  });

  // Auth section
  const loginBtn = document.getElementById('loginBtn');
  if (loginBtn) loginBtn.addEventListener('click', login);
  
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) logoutBtn.addEventListener('click', logout);
  
  const getMeBtn = document.getElementById('getMeBtn');
  if (getMeBtn) getMeBtn.addEventListener('click', getMe);

  // Password toggles
  document.querySelectorAll('.password-toggle').forEach(toggle => {
    toggle.addEventListener('click', function() {
      const targetId = this.getAttribute('data-target');
      if (targetId) togglePassword(targetId);
    });
  });

  // Users section
  const getUsersBtn = document.getElementById('getUsersBtn');
  if (getUsersBtn) getUsersBtn.addEventListener('click', getUsers);
  
  const checkUsersBtn = document.getElementById('checkUsersBtn');
  if (checkUsersBtn) checkUsersBtn.addEventListener('click', checkUsersInDB);
  
  const createUserBtn = document.getElementById('createUserBtn');
  if (createUserBtn) createUserBtn.addEventListener('click', createUser);
  
  const updateUserBtn = document.getElementById('updateUserBtn');
  if (updateUserBtn) updateUserBtn.addEventListener('click', updateUser);
  
  const cancelEditUserBtn = document.getElementById('cancelEditUserBtn');
  if (cancelEditUserBtn) cancelEditUserBtn.addEventListener('click', cancelEditUser);

  // Event delegation for dynamically created edit user buttons
  const usersList = document.getElementById('usersList');
  if (usersList) {
    usersList.addEventListener('click', function(e) {
      if (e.target && e.target.classList.contains('edit-user-btn')) {
        const userId = parseInt(e.target.getAttribute('data-user-id'));
        editUser(userId);
      }
    });
  }

  // Tasks section
  const getTasksBtn = document.getElementById('getTasksBtn');
  if (getTasksBtn) getTasksBtn.addEventListener('click', getTasks);
  
  const checkTasksBtn = document.getElementById('checkTasksBtn');
  if (checkTasksBtn) checkTasksBtn.addEventListener('click', checkTasksInDB);
  
  const createTaskBtn = document.getElementById('createTaskBtn');
  if (createTaskBtn) createTaskBtn.addEventListener('click', createTask);

  // Devices section
  const getDevicesBtn = document.getElementById('getDevicesBtn');
  if (getDevicesBtn) getDevicesBtn.addEventListener('click', getDevices);
  
  const checkDevicesBtn = document.getElementById('checkDevicesBtn');
  if (checkDevicesBtn) checkDevicesBtn.addEventListener('click', checkDevicesInDB);
  
  const createDeviceBtn = document.getElementById('createDeviceBtn');
  if (createDeviceBtn) createDeviceBtn.addEventListener('click', createDevice);

  // Email section
  const checkEmailConfigBtn = document.getElementById('checkEmailConfigBtn');
  if (checkEmailConfigBtn) checkEmailConfigBtn.addEventListener('click', checkEmailConfig);
  
  const testSmtpBtn = document.getElementById('testSmtpBtn');
  if (testSmtpBtn) testSmtpBtn.addEventListener('click', testSmtp);
  
  const sendTestEmailBtn = document.getElementById('sendTestEmailBtn');
  if (sendTestEmailBtn) sendTestEmailBtn.addEventListener('click', sendTestEmail);
  
  const getQueueStatsBtn = document.getElementById('getQueueStatsBtn');
  if (getQueueStatsBtn) getQueueStatsBtn.addEventListener('click', getQueueStats);

  // Documents section
  const uploadDocBtn = document.getElementById('uploadDocBtn');
  if (uploadDocBtn) uploadDocBtn.addEventListener('click', uploadDocument);
  
  const getDocumentsBtn = document.getElementById('getDocumentsBtn');
  if (getDocumentsBtn) getDocumentsBtn.addEventListener('click', getDocuments);
  
  const getDocumentBtn = document.getElementById('getDocumentBtn');
  if (getDocumentBtn) getDocumentBtn.addEventListener('click', getDocument);
  
  const downloadDocumentBtn = document.getElementById('downloadDocumentBtn');
  if (downloadDocumentBtn) downloadDocumentBtn.addEventListener('click', downloadDocument);
  
  const deleteDocumentBtn = document.getElementById('deleteDocumentBtn');
  if (deleteDocumentBtn) deleteDocumentBtn.addEventListener('click', deleteDocument);

  // Templates section
  const uploadTemplateBtn = document.getElementById('uploadTemplateBtn');
  if (uploadTemplateBtn) uploadTemplateBtn.addEventListener('click', uploadTemplate);
  
  const getTemplatesBtn = document.getElementById('getTemplatesBtn');
  if (getTemplatesBtn) getTemplatesBtn.addEventListener('click', getTemplates);
  
  const generateDocBtn = document.getElementById('generateDocBtn');
  if (generateDocBtn) generateDocBtn.addEventListener('click', generateDocument);

  // Import section
  const uploadCSVBtn = document.getElementById('uploadCSVBtn');
  if (uploadCSVBtn) uploadCSVBtn.addEventListener('click', uploadCSV);
  
  const downloadCSVTemplateBtn = document.getElementById('downloadCSVTemplateBtn');
  if (downloadCSVTemplateBtn) downloadCSVTemplateBtn.addEventListener('click', downloadCSVTemplate);
  
  const confirmImportBtn = document.getElementById('confirmImportBtn');
  if (confirmImportBtn) confirmImportBtn.addEventListener('click', confirmImport);
  
  const cancelImportBtn = document.getElementById('cancelImportBtn');
  if (cancelImportBtn) cancelImportBtn.addEventListener('click', cancelImport);
  
  const getImportHistoryBtn = document.getElementById('getImportHistoryBtn');
  if (getImportHistoryBtn) getImportHistoryBtn.addEventListener('click', getImportHistory);

  // BOM Builder section
  const getMaterialsBtn = document.getElementById('getMaterialsBtn');
  if (getMaterialsBtn) getMaterialsBtn.addEventListener('click', getMaterials);
  
  const getCategoriesBtn = document.getElementById('getCategoriesBtn');
  if (getCategoriesBtn) getCategoriesBtn.addEventListener('click', getCategories);
  
  const getTaskTypeBOMBtn = document.getElementById('getTaskTypeBOMBtn');
  if (getTaskTypeBOMBtn) getTaskTypeBOMBtn.addEventListener('click', getTaskTypeBOM);
  
  const createMaterialBtn = document.getElementById('createMaterialBtn');
  if (createMaterialBtn) createMaterialBtn.addEventListener('click', createMaterial);
  
  const copyBOMTemplateBtn = document.getElementById('copyBOMTemplateBtn');
  if (copyBOMTemplateBtn) copyBOMTemplateBtn.addEventListener('click', copyBOMTemplate);

  // BOM Triggers section
  const listBomTriggersBtn = document.getElementById('listBomTriggersBtn');
  if (listBomTriggersBtn) listBomTriggersBtn.addEventListener('click', listBomTriggers);
  
  const createBomTriggerBtn = document.getElementById('createBomTriggerBtn');
  if (createBomTriggerBtn) createBomTriggerBtn.addEventListener('click', createBomTrigger);
  
  const getBomTriggerBtn = document.getElementById('getBomTriggerBtn');
  if (getBomTriggerBtn) getBomTriggerBtn.addEventListener('click', getBomTrigger);
  
  const toggleBomTriggerBtn = document.getElementById('toggleBomTriggerBtn');
  if (toggleBomTriggerBtn) toggleBomTriggerBtn.addEventListener('click', toggleBomTrigger);
  
  const testBomTriggerBtn = document.getElementById('testBomTriggerBtn');
  if (testBomTriggerBtn) testBomTriggerBtn.addEventListener('click', testBomTrigger);
  
  const getBomTriggerLogsBtn = document.getElementById('getBomTriggerLogsBtn');
  if (getBomTriggerLogsBtn) getBomTriggerLogsBtn.addEventListener('click', getBomTriggerLogs);
  
  const getBomTriggerEventsBtn = document.getElementById('getBomTriggerEventsBtn');
  if (getBomTriggerEventsBtn) getBomTriggerEventsBtn.addEventListener('click', getBomTriggerEvents);
  
  const getBomTriggerActionsBtn = document.getElementById('getBomTriggerActionsBtn');
  if (getBomTriggerActionsBtn) getBomTriggerActionsBtn.addEventListener('click', getBomTriggerActions);
  
  const deleteBomTriggerBtn = document.getElementById('deleteBomTriggerBtn');
  if (deleteBomTriggerBtn) deleteBomTriggerBtn.addEventListener('click', deleteBomTrigger);

  // Database section
  const clearUsersBtn = document.getElementById('clearUsersBtn');
  if (clearUsersBtn) clearUsersBtn.addEventListener('click', clearUsers);
  
  const clearTasksBtn = document.getElementById('clearTasksBtn');
  if (clearTasksBtn) clearTasksBtn.addEventListener('click', clearTasks);
  
  const clearDevicesBtn = document.getElementById('clearDevicesBtn');
  if (clearDevicesBtn) clearDevicesBtn.addEventListener('click', clearDevices);
  
  const clearEmailQueueBtn = document.getElementById('clearEmailQueueBtn');
  if (clearEmailQueueBtn) clearEmailQueueBtn.addEventListener('click', clearEmailQueue);
  
  const getDBStatsBtn = document.getElementById('getDBStatsBtn');
  if (getDBStatsBtn) getDBStatsBtn.addEventListener('click', getDBStats);

  // Initialize auth status
  updateAuthStatus();
  console.log('🧪 API Tester initialized');
  console.log('API URL:', API_URL);
});
