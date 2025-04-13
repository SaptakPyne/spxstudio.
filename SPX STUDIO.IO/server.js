require('dotenv').config();
const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

// In-memory storage for user credentials (would be a database in production)
const userCredentials = {};

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files from public directory
app.use(express.static(path.join(__dirname, './')));

// Product database (in a real app, this would be in a database)
const products = {
  'template1': {
    name: 'Modern Business Pro',
    description: 'Responsive business website template with multiple pages and sections.',
    price: 5900, // in cents
    images: []
  },
  'template2': {
    name: 'Gradient UI Kit',
    description: 'Complete UI kit with over 300 components, perfect for modern apps.',
    price: 3900,
    images: []
  },
  'template3': {
    name: 'Social Media Pack',
    description: 'Complete social media template pack with 50+ designs for all platforms.',
    price: 2900,
    images: []
  },
  'template4': {
    name: 'Corporate Branding Pack',
    description: 'Complete branding pack with business cards, letterheads, and more.',
    price: 4900,
    images: []
  },
  'template5': {
    name: 'E-commerce Template',
    description: 'Complete e-commerce website template with product pages and checkout.',
    price: 6900,
    images: []
  },
  'template6': {
    name: 'Portfolio Presentation',
    description: 'Modern portfolio presentation template with multiple layout options.',
    price: 3500,
    images: []
  },
  'template7': {
    name: 'Mobile App UI Kit',
    description: 'Complete mobile app UI kit with 200+ screens and components.',
    price: 5500,
    images: []
  },
  'template8': {
    name: 'Instagram Story Pack',
    description: 'Creative Instagram story templates for businesses and influencers.',
    price: 1900,
    images: []
  },
  'template9': {
    name: 'Marketing Materials Bundle',
    description: 'Complete marketing materials bundle with flyers, brochures, and more.',
    price: 5900,
    images: []
  }
};

// Route for serving the index.html file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// API endpoint to create a payment intent
app.post('/api/create-payment-intent', async (req, res) => {
  try {
    const { templateId } = req.body;

    // Validate product exists
    if (!products[templateId]) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const product = products[templateId];

    // Create a PaymentIntent with the order amount and currency
    const paymentIntent = await stripe.paymentIntents.create({
      amount: product.price,
      currency: 'usd',
      metadata: {
        templateId,
        productName: product.name
      },
    });

    // Send back the client secret for the payment intent
    res.json({
      clientSecret: paymentIntent.client_secret,
      product: {
        name: product.name,
        price: product.price / 100 // Convert back to dollars for display
      }
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({ error: 'Failed to create payment intent' });
  }
});

// API endpoint to retrieve all templates
app.get('/api/templates', (req, res) => {
  // Convert to array format
  const templatesArray = Object.keys(products).map(key => ({
    id: key,
    ...products[key],
    price: products[key].price / 100 // Convert to dollars for display
  }));
  
  res.json(templatesArray);
});

// API endpoint to retrieve a specific template
app.get('/api/templates/:id', (req, res) => {
  const { id } = req.params;
  const product = products[id];
  
  if (!product) {
    return res.status(404).json({ error: 'Template not found' });
  }
  
  res.json({
    id,
    ...product,
    price: product.price / 100 // Convert to dollars for display
  });
});

// Endpoint for bank transfer payment instructions
app.post('/api/bank-transfer-info', (req, res) => {
  const { templateId } = req.body;
  
  // Validate product exists
  if (!products[templateId]) {
    return res.status(404).json({ error: 'Product not found' });
  }

  const product = products[templateId];
  
  // Return bank transfer information
  res.json({
    success: true,
    payment_info: {
      payment_destination: "kabitapyne46@oksbi",
      bank_name: "State Bank of India (OKSBI)",
      account_name: "Kabita Pyne",
      amount: product.price / 100, // Convert to dollars
      reference: `TEMPLATE-${templateId}-${Date.now().toString().slice(-6)}`,
      instructions: "Please send payment confirmation to payments@spxstudio.com after transfer."
    }
  });
});

// Webhook for handling successful payments
app.post('/webhook', express.raw({type: 'application/json'}), async (req, res) => {
  const signature = req.headers['stripe-signature'];

  let event;

  try {
    // Verify webhook signature and extract the event
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.log(`⚠️  Webhook signature verification failed.`, err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      // Handle successful payment - in a real app, you would trigger download or access
      console.log(`PaymentIntent for ${paymentIntent.amount} was successful!`);
      // Here you'd update a database, send an email, etc.
      break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  // Return a 200 response to acknowledge receipt of the event
  res.json({received: true});
});

// Set up multer storage configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const fileType = req.params.type;
    const uploadDir = path.join(__dirname, `uploads/${fileType}`);
    
    // Ensure directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Create unique filename with original extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// File filter to handle various file types
const fileFilter = (req, file, cb) => {
  const fileType = req.params.type;
  
  if (fileType === 'images') {
    // Accept images only
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed!'), false);
    }
  } else if (fileType === 'videos') {
    // Accept videos only
    if (!file.mimetype.startsWith('video/')) {
      return cb(new Error('Only video files are allowed!'), false);
    }
  } else if (fileType === 'documents') {
    // Accept document types
    const allowedMimes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 
                          'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                          'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                          'text/plain'];
    if (!allowedMimes.includes(file.mimetype)) {
      return cb(new Error('File type not supported!'), false);
    }
  } else if (fileType === 'data') {
    // Accept data file types
    const allowedMimes = ['text/csv', 'application/json', 'application/xml', 'text/plain', 
                          'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    if (!allowedMimes.includes(file.mimetype)) {
      return cb(new Error('File type not supported!'), false);
    }
  } else {
    return cb(new Error('Invalid file type category!'), false);
  }
  
  cb(null, true);
};

// Configure upload settings with size limits
const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB max file size
  }
});

// File upload API endpoint
app.post('/api/upload/:type', (req, res) => {
  const fileType = req.params.type;
  
  if (!['data', 'images', 'videos', 'documents'].includes(fileType)) {
    return res.status(400).json({ error: 'Invalid file type category' });
  }
  
  const uploadMiddleware = upload.array('files', 10); // Allow up to 10 files
  
  uploadMiddleware(req, res, function (err) {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File size too large' });
      }
      return res.status(400).json({ error: err.message });
    }
    
    // Successfully uploaded files
    const uploadedFiles = req.files.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
      path: file.path,
      url: `/uploads/${fileType}/${file.filename}`
    }));
    
    res.json({
      success: true,
      message: `${uploadedFiles.length} files uploaded successfully`,
      files: uploadedFiles
    });
  });
});

// Serve the uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API endpoint to get all uploaded files
app.get('/api/files/:type', (req, res) => {
  const fileType = req.params.type;
  
  if (!['data', 'images', 'videos', 'documents'].includes(fileType)) {
    return res.status(400).json({ error: 'Invalid file type category' });
  }
  
  const uploadDir = path.join(__dirname, `uploads/${fileType}`);
  
  if (!fs.existsSync(uploadDir)) {
    return res.json({ files: [] });
  }
  
  try {
    const files = fs.readdirSync(uploadDir);
    const fileObjects = files.map(filename => {
      const filePath = path.join(uploadDir, filename);
      const stats = fs.statSync(filePath);
      
      return {
        filename,
        size: stats.size,
        uploaded: stats.mtime,
        url: `/uploads/${fileType}/${filename}`
      };
    });
    
    res.json({ files: fileObjects });
  } catch (error) {
    console.error('Error reading files:', error);
    res.status(500).json({ error: 'Failed to retrieve files' });
  }
});

// Create website projects storage
const websiteProjects = {};
const domainRegistrations = {};

// API endpoint to save a website project
app.post('/api/projects/save', (req, res) => {
  try {
    const { projectId, projectName, htmlContent, userId, password } = req.body;
    
    if (!projectId || !htmlContent) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Create a unique project ID if not provided
    const id = projectId || `project_${Date.now()}`;
    
    // Store the project data
    websiteProjects[id] = {
      id,
      name: projectName || 'Untitled Project',
      html: htmlContent,
      css: req.body.cssContent || '',
      js: req.body.jsContent || '',
      userId: userId || 'anonymous',
      password: password || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    res.json({
      success: true,
      message: 'Project saved successfully',
      projectId: id
    });
  } catch (error) {
    console.error('Error saving project:', error);
    res.status(500).json({ error: 'Failed to save project' });
  }
});

// API endpoint to get a website project
app.get('/api/projects/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.query;
    
    // Check if project exists
    if (!websiteProjects[id]) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    const project = websiteProjects[id];
    
    // Check if password is required and matches
    if (project.password && project.password !== password) {
      return res.status(401).json({ error: 'Invalid password' });
    }
    
    // Return project data without password
    const { password: _, ...projectData } = project;
    
    res.json({
      success: true,
      project: projectData
    });
  } catch (error) {
    console.error('Error retrieving project:', error);
    res.status(500).json({ error: 'Failed to retrieve project' });
  }
});

// API endpoint to list all website projects for a user
app.get('/api/projects', (req, res) => {
  try {
    const { userId, password } = req.query;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    // Check if user credentials match
    if (userCredentials[userId] && userCredentials[userId] !== password) {
      return res.status(401).json({ error: 'Invalid password' });
    }
    
    // Filter projects by userId
    const userProjects = Object.values(websiteProjects)
      .filter(project => project.userId === userId)
      .map(({ password: _, ...project }) => project); // Remove password from response
    
    res.json({
      success: true,
      projects: userProjects
    });
  } catch (error) {
    console.error('Error listing projects:', error);
    res.status(500).json({ error: 'Failed to list projects' });
  }
});

// API endpoint to register a domain
app.post('/api/domains/register', (req, res) => {
  try {
    const { domainName, plan, projectId, userId, isPremiumUser } = req.body;
    
    if (!domainName || !plan || !projectId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Check if domain already exists
    const fullDomain = `${domainName}.spxstudio.com`;
    if (domainRegistrations[fullDomain]) {
      return res.status(400).json({ error: 'Domain already registered' });
    }
    
    // Check if project exists
    if (!websiteProjects[projectId]) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    // Calculate price based on plan with premium discount
    let basePrice = 0;
    switch (plan) {
      case 'basic':
        basePrice = 4.99;
        break;
      case 'standard':
        basePrice = 9.99;
        break;
      case 'premium':
        basePrice = 19.99;
        break;
      default:
        return res.status(400).json({ error: 'Invalid plan' });
    }
    
    // Apply 20% discount for premium users
    const finalPrice = isPremiumUser ? basePrice * 0.8 : basePrice;
    
    // Register the domain
    domainRegistrations[fullDomain] = {
      domain: fullDomain,
      plan,
      projectId,
      userId: userId || 'anonymous',
      price: finalPrice,
      registeredAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1 year
    };
    
    res.json({
      success: true,
      message: 'Domain registered successfully',
      domain: fullDomain,
      price: finalPrice,
      isPremiumDiscount: isPremiumUser
    });
  } catch (error) {
    console.error('Error registering domain:', error);
    res.status(500).json({ error: 'Failed to register domain' });
  }
});

// API endpoint to check if a domain is available
app.get('/api/domains/check/:domain', (req, res) => {
  try {
    const { domain } = req.params;
    const fullDomain = `${domain}.spxstudio.com`;
    
    const isAvailable = !domainRegistrations[fullDomain];
    
    res.json({
      success: true,
      domain: fullDomain,
      available: isAvailable
    });
  } catch (error) {
    console.error('Error checking domain:', error);
    res.status(500).json({ error: 'Failed to check domain availability' });
  }
});

// API endpoint to get all domains for a user
app.get('/api/domains', (req, res) => {
  try {
    const { userId, password } = req.query;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    // Check if user credentials match
    if (userCredentials[userId] && userCredentials[userId] !== password) {
      return res.status(401).json({ error: 'Invalid password' });
    }
    
    // Filter domains by userId
    const userDomains = Object.values(domainRegistrations)
      .filter(domain => domain.userId === userId);
    
    res.json({
      success: true,
      domains: userDomains
    });
  } catch (error) {
    console.error('Error listing domains:', error);
    res.status(500).json({ error: 'Failed to list domains' });
  }
});

// API endpoint to check premium user status
app.get('/api/user/premium-status', (req, res) => {
  try {
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    // Check if user exists in our credentials store
    const userExists = userCredentials[userId];
    
    // In a real implementation, this would check the database
    // For demo purposes, we'll check if the user ID or email contains "premium"
    const isPremium = userId.toLowerCase().includes('premium');
    
    res.json({
      success: true,
      userId,
      isPremiumUser: isPremium,
      discountRate: isPremium ? 0.2 : 0 // 20% discount
    });
  } catch (error) {
    console.error('Error checking premium status:', error);
    res.status(500).json({ error: 'Failed to check premium status' });
  }
});

// API endpoint for user login
app.post('/api/user/login', (req, res) => {
  try {
    const { userId, email, password, isPremium } = req.body;
    
    if (!userId || !email || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Store user credentials
    userCredentials[userId] = {
      userId,
      email,
      password,
      isPremium: isPremium || false,
      createdAt: new Date().toISOString()
    };
    
    res.json({
      success: true,
      message: 'Login successful',
      userId,
      email,
      isPremiumUser: isPremium
    });
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
});

// API endpoint for user authentication
app.post('/api/user/authenticate', (req, res) => {
  try {
    const { userId, password } = req.body;
    
    if (!userId || !password) {
      return res.status(400).json({ error: 'User ID and password are required' });
    }
    
    // Check if user exists and password matches
    const user = userCredentials[userId];
    
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    if (user.password !== password) {
      return res.status(401).json({ error: 'Invalid password' });
    }
    
    res.json({
      success: true,
      message: 'Authentication successful',
      userId: user.userId,
      email: user.email,
      isPremiumUser: user.isPremium
    });
  } catch (error) {
    console.error('Error authenticating user:', error);
    res.status(500).json({ error: 'Failed to authenticate user' });
  }
});

// API endpoint to get user profile
app.get('/api/user/profile/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    // Check if user exists
    const user = userCredentials[userId];
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Don't send password in response
    const { password, ...userProfile } = user;
    
    res.json({
      success: true,
      user: userProfile
    });
  } catch (error) {
    console.error('Error getting user profile:', error);
    res.status(500).json({ error: 'Failed to get user profile' });
  }
});

// Start the server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});