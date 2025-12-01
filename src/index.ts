import express from 'express'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'

const app = express()

// Middleware để parse JSON
app.use(express.json())
app.use(express.static('public'))

// In-memory data store
interface UserInfo {
  email: string
  plan_type: string
  status: 'none' | 'cancel' | 'active'
}

// File path để lưu data (sử dụng /tmp trên Vercel, hoặc local file khi dev)
const DATA_FILE = process.env.VERCEL 
  ? '/tmp/userdata.json' 
  : join(process.cwd(), 'userdata.json')

// Helper functions để load và save data
function loadData(): Map<string, UserInfo> {
  const store = new Map<string, UserInfo>()
  
  try {
    if (existsSync(DATA_FILE)) {
      const fileContent = readFileSync(DATA_FILE, 'utf-8')
      const data = JSON.parse(fileContent)
      
      if (Array.isArray(data)) {
        // Format cũ: array
        data.forEach((user: UserInfo) => {
          store.set(user.email, user)
        })
      } else if (typeof data === 'object') {
        // Format mới: object với email làm key
        Object.entries(data).forEach(([email, user]) => {
          store.set(email, user as UserInfo)
        })
      }
    }
  } catch (error) {
    console.error('Error loading data:', error)
  }
  
  return store
}

function saveData(store: Map<string, UserInfo>): void {
  try {
    const data: Record<string, UserInfo> = {}
    store.forEach((user, email) => {
      data[email] = user
    })
    writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8')
  } catch (error) {
    console.error('Error saving data:', error)
  }
}

// Load data khi khởi động
const userDataStore = loadData()

// API endpoint GET /api/uinfo
app.get('/api/uinfo', (req, res) => {
  const email = req.query.email as string
  
  if (!email) {
    return res.status(400).json({ error: 'Email parameter is required' })
  }
  
  const userInfo = userDataStore.get(email)
  
  if (!userInfo) {
    return res.json({})
  }
  
  res.json(userInfo)
})

// API endpoint GET /api/users - Lấy tất cả users
app.get('/api/users', (req, res) => {
  const users = Array.from(userDataStore.values())
  res.json(users)
})

// API endpoint POST /api/users - Tạo user mới
app.post('/api/users', (req, res) => {
  const { email, plan_type, status } = req.body
  
  if (!email || !plan_type || !status) {
    return res.status(400).json({ error: 'Email, plan_type, and status are required' })
  }
  
  if (!['none', 'cancel', 'active'].includes(status)) {
    return res.status(400).json({ error: 'Status must be one of: none, cancel, active' })
  }
  
  if (!['14010110', '14010120', '14010130'].includes(plan_type)) {
    return res.status(400).json({ error: 'Plan type must be one of: 14010110, 14010120, 14010130' })
  }
  
  if (userDataStore.has(email)) {
    return res.status(400).json({ error: 'User with this email already exists' })
  }
  
  const userInfo: UserInfo = { email, plan_type, status }
  userDataStore.set(email, userInfo)
  saveData(userDataStore)
  
  res.json(userInfo)
})

// API endpoint PUT /api/users/:email - Cập nhật user
app.put('/api/users/:email', (req, res) => {
  const email = req.params.email
  const { plan_type, status } = req.body
  
  if (!userDataStore.has(email)) {
    return res.status(404).json({ error: 'User not found' })
  }
  
  if (status && !['none', 'cancel', 'active'].includes(status)) {
    return res.status(400).json({ error: 'Status must be one of: none, cancel, active' })
  }
  
  if (plan_type && !['14010110', '14010120', '14010130'].includes(plan_type)) {
    return res.status(400).json({ error: 'Plan type must be one of: 14010110, 14010120, 14010130' })
  }
  
  const existingUser = userDataStore.get(email)!
  const updatedUser: UserInfo = {
    email,
    plan_type: plan_type || existingUser.plan_type,
    status: status || existingUser.status
  }
  
  userDataStore.set(email, updatedUser)
  saveData(userDataStore)
  res.json(updatedUser)
})

// API endpoint DELETE /api/users/:email - Xóa user
app.delete('/api/users/:email', (req, res) => {
  const email = req.params.email
  
  if (!userDataStore.has(email)) {
    return res.status(404).json({ error: 'User not found' })
  }
  
  userDataStore.delete(email)
  saveData(userDataStore)
  res.json({ message: 'User deleted successfully' })
})

// Home route - HTML
app.get('/', (req, res) => {
  res.type('html').send(`
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>User Management</title>
        <link rel="stylesheet" href="/style.css" />
      </head>
      <body>
        <div class="container">
          <div class="header">
            <input type="text" id="searchInput" class="search-input" placeholder="search" />
            <button class="btn btn-primary" onclick="openCreateModal()">create new</button>
          </div>
          
          <div class="users-list" id="usersList">
            <!-- Users will be loaded here -->
          </div>
        </div>
        
        <!-- Create/Edit Modal -->
        <div id="modal" class="modal">
          <div class="modal-content">
            <span class="close" onclick="closeModal()">&times;</span>
            <h2 id="modalTitle">Create New User</h2>
            <form id="userForm">
              <div class="form-group">
                <label for="email">Email:</label>
                <input type="email" id="email" name="email" required />
              </div>
              <div class="form-group">
                <label for="planType">Plan Type:</label>
                <select id="planType" name="planType" required>
                  <option value="14010110">エントリー年契約 (entry) - 14010110</option>
                  <option value="14010120">ベーシック年契約 (basic) - 14010120</option>
                  <option value="14010130">ベーシックプラス年契約 (basic plus) - 14010130</option>
                </select>
              </div>
              <div class="form-group">
                <label for="status">Status:</label>
                <select id="status" name="status" required>
                  <option value="none">none</option>
                  <option value="cancel">cancel</option>
                  <option value="active">active</option>
                </select>
              </div>
              <div class="form-actions">
                <button type="submit" class="btn btn-primary">Save</button>
                <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
              </div>
            </form>
          </div>
        </div>
        
        <script src="/app.js"></script>
      </body>
    </html>
  `)
})

export default app
