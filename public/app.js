let currentEditEmail = null;

// Load users on page load
document.addEventListener('DOMContentLoaded', () => {
  loadUsers();
  
  // Search functionality
  const searchInput = document.getElementById('searchInput');
  searchInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    filterUsers(searchTerm);
  });
  
  // Form submit handler
  const form = document.getElementById('userForm');
  form.addEventListener('submit', handleFormSubmit);
});

async function loadUsers() {
  try {
    const response = await fetch('/api/users');
    const users = await response.json();
    displayUsers(users);
  } catch (error) {
    console.error('Error loading users:', error);
  }
}

function displayUsers(users) {
  const usersList = document.getElementById('usersList');
  
  if (users.length === 0) {
    usersList.innerHTML = '<div class="empty-state">No users found</div>';
    return;
  }
  
  usersList.innerHTML = users.map(user => `
    <div class="user-item">
      <div class="user-email">${user.email}</div>
      <div class="user-status">${user.status}</div>
      <div class="user-actions">
        <button class="btn btn-edit" onclick="openEditModal('${user.email}')">edit</button>
        <button class="btn btn-delete" onclick="deleteUser('${user.email}')">delete</button>
      </div>
    </div>
  `).join('');
}

function filterUsers(searchTerm) {
  const userItems = document.querySelectorAll('.user-item');
  userItems.forEach(item => {
    const email = item.querySelector('.user-email').textContent.toLowerCase();
    if (email.includes(searchTerm)) {
      item.style.display = 'flex';
    } else {
      item.style.display = 'none';
    }
  });
}

function openCreateModal() {
  currentEditEmail = null;
  document.getElementById('modalTitle').textContent = 'Create New User';
  document.getElementById('userForm').reset();
  document.getElementById('email').disabled = false;
  document.getElementById('modal').style.display = 'block';
}

function openEditModal(email) {
  currentEditEmail = email;
  document.getElementById('modalTitle').textContent = 'Edit User';
  document.getElementById('email').value = email;
  document.getElementById('email').disabled = true;
  
  // Fetch user data and populate form
  fetch(`/api/uinfo?email=${encodeURIComponent(email)}`)
    .then(res => res.json())
    .then(user => {
      if (user.email) {
        document.getElementById('planType').value = user.plan_type;
        document.getElementById('status').value = user.status;
        document.getElementById('modal').style.display = 'block';
      }
    })
    .catch(error => {
      console.error('Error loading user:', error);
    });
}

function closeModal() {
  document.getElementById('modal').style.display = 'none';
  currentEditEmail = null;
  document.getElementById('userForm').reset();
}

async function handleFormSubmit(e) {
  e.preventDefault();
  
  const email = document.getElementById('email').value;
  const planType = document.getElementById('planType').value;
  const status = document.getElementById('status').value;
  
  try {
    if (currentEditEmail) {
      // Update existing user
      const response = await fetch(`/api/users/${encodeURIComponent(currentEditEmail)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ plan_type: planType, status })
      });
      
      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Error updating user');
        return;
      }
    } else {
      // Create new user
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, plan_type: planType, status })
      });
      
      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Error creating user');
        return;
      }
    }
    
    closeModal();
    loadUsers();
  } catch (error) {
    console.error('Error saving user:', error);
    alert('Error saving user');
  }
}

async function deleteUser(email) {
  if (!confirm(`Are you sure you want to delete ${email}?`)) {
    return;
  }
  
  try {
    const response = await fetch(`/api/users/${encodeURIComponent(email)}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      const error = await response.json();
      alert(error.error || 'Error deleting user');
      return;
    }
    
    loadUsers();
  } catch (error) {
    console.error('Error deleting user:', error);
    alert('Error deleting user');
  }
}

// Close modal when clicking outside
window.onclick = function(event) {
  const modal = document.getElementById('modal');
  if (event.target === modal) {
    closeModal();
  }
}

