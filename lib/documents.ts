// This file stores the knowledge base documents
// You can add your 200-300 line texts here as separate documents

export interface Document {
  id: string;
  title: string;
  content: string;
}

export const documents: Document[] = [
  {
    id: "doc1",
    title: "Sample Document 1",
    content: `# AI Content Notarization & NFT Platform


## 🎯 Project Overview

A Next.js-based decentralized platform that generates AI content (text and images), notarizes it with cryptographic proof on IPFS, and enables NFT minting. The platform ensures authenticity, provenance, and ownership of AI-generated content through blockchain technology and distributed storage.

---

## 🏗️ Architecture & Technology Stack

### **Frontend Framework**
- **Next.js 15.5.6** - React framework with App Router
- **TypeScript 5.6.3** - Type-safe development
- **Tailwind CSS 3.4.14** - Utility-first styling
- **React 19** - UI component library

### **AI Integration**
- **OpenRouter API** (`openai/gpt-oss-20b:free`) - Text generation
- **Puter.js v2** (`gpt-image-1-mini`) - Image generation

### **Blockchain & Web3**
- **MetaMask** - Ethereum wallet integration
- **EIP-191** - Personal message signing standard
- **Mintable** - NFT marketplace integration

### **Distributed Storage**
- **IPFS (InterPlanetary File System)** - Decentralized file storage
- **Pinata** - IPFS pinning service and gateway

### **Cryptography**
- **SHA-256** - Content hashing
- **EIP-191 Signatures** - Cryptographic proof of ownership

---

## 📚 Theoretical Foundations

### **1. Artificial Intelligence (AI)**

#### What is AI?
Artificial Intelligence refers to computer systems that can perform tasks requiring human intelligence, such as understanding language, generating images, and making decisions.

#### AI Models Used

**Text Generation (OpenRouter)**
- **Model**: openai/gpt-oss-20b:free
- **Technology**: Large Language Model (LLM)
- **How it works**: 
  - Trained on vast amounts of text data
  - Uses transformer architecture to predict next words
  - Generates coherent, contextual responses
  - Processes user prompts and generates human-like text

**Image Generation (Puter.js)**
- **Model**: gpt-image-1-mini
- **Technology**: Text-to-Image diffusion model
- **How it works**:
  - Converts text descriptions into visual representations
  - Uses latent diffusion process
  - Starts with random noise and iteratively refines it
  - Guided by text embeddings to create matching images

#### The AI Generation Problem
- **Authenticity**: How do you prove content is AI-generated?
- **Provenance**: Who created it and when?
- **Ownership**: Who has rights to the content?
- **Tampering**: How to prevent unauthorized modifications?

**Our Solution**: Cryptographic notarization with blockchain verification

---

### **2. IPFS (InterPlanetary File System)**

#### What is IPFS?
IPFS is a peer-to-peer distributed file system that connects all computing devices with the same system of files.

#### Key Concepts

**Content Addressing**
- Files are identified by their content, not location
- Each file gets a unique hash (CID - Content Identifier)
- Same content = Same CID, regardless of who uploaded it
- Example CID: `QmPJ6...GRqzz`

**How IPFS Works**
1. **Upload**: File is broken into chunks
2. **Hashing**: Each chunk gets a cryptographic hash
3. **Merkle DAG**: Chunks are organized in a tree structure
4. **Distribution**: Chunks are distributed across network nodes
5. **Retrieval**: Content is reassembled from multiple sources

**Benefits**
- ✅ **Permanent**: Content cannot be deleted if anyone pins it
- ✅ **Verifiable**: Hash proves content hasn't been tampered with
- ✅ **Decentralized**: No single point of failure
- ✅ **Efficient**: Deduplication saves storage

**Limitations**
- ❌ **Persistence**: Content needs to be "pinned" to stay available
- ❌ **Speed**: Can be slower than centralized servers
- ❌ **Privacy**: All content is public by default

---

### **3. Pinata (IPFS Pinning Service)**

#### What is Pinata?
Pinata is a service that "pins" your files on IPFS, ensuring they remain available permanently.

#### How Pinning Works
- **Without Pinning**: Files may disappear if no one hosts them
- **With Pinning**: Pinata's servers continuously host your files
- **Redundancy**: Files are replicated across multiple locations

#### Pinata Services We Use

**File Upload API**
```
POST https://api.pinata.cloud/pinning/pinFileToIPFS
```
- Uploads files (images, text, biometric photos)
- Returns Content Identifier (CID)
- Pins content automatically

**JSON Upload API**
```
POST https://api.pinata.cloud/pinning/pinJSONToIPFS
```
- Uploads JSON data (certificates)
- Structured metadata storage
- Easy retrieval and parsing

**Gateway Access**
```
https://gateway.pinata.cloud/ipfs/{CID}
```
- Public access to pinned content
- HTTP interface to IPFS
- Fast content delivery

#### Our Pinata Integration
- **API Key**: `0d0fa3e095a32ac2c75c`
- **JWT Authentication**: Bearer token for API calls
- **Storage**: Content, certificates, biometric images
- **Retrieval**: Fetch certificates dynamically

---

### **4. NFT (Non-Fungible Token)**

#### What is an NFT?
A Non-Fungible Token is a unique digital asset stored on a blockchain that represents ownership of a specific item.

#### Key Characteristics
- **Non-Fungible**: Each token is unique and cannot be exchanged 1:1
- **Verifiable**: Ownership is recorded on blockchain
- **Transferable**: Can be bought, sold, or traded
- **Programmable**: Smart contracts define behavior

#### NFT Structure
```json
{
  "name": "AI Generated Art #123",
  "description": "Notarized AI content",
  "image": "ipfs://QmXXX...",
  "attributes": [
    {"trait_type": "Content Type", "value": "AI Image"},
    {"trait_type": "Model", "value": "gpt-image-1-mini"},
    {"trait_type": "Certificate", "value": "ipfs://QmYYY..."}
  ]
}
```

#### Why NFT for AI Content?
- **Proof of Ownership**: Immutable record of who created it
- **Monetization**: Sell AI-generated art
- **Provenance**: Full history of ownership transfers
- **Royalties**: Creator can earn from resales

#### Mintable Integration
- **Platform**: marketplace.mintable.com
- **Features**: User-friendly NFT creation
- **Blockchain**: Ethereum-based
- **Usage**: Our app opens Mintable in iframe for seamless minting

---

## 🔐 Cryptographic Notarization System

### **The Problem**
How do you prove:
1. You created specific AI content?
2. It was created at a specific time?
3. The content hasn't been altered?
4. The prompt used to generate it?

### **Our Solution: Chain-of-Trust**

#### **Step 1: Content Hashing (SHA-256)**
```typescript
Content → SHA-256 → Hash
"Hello World" → a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e
```
- Any change in content = Different hash
- Same content = Same hash (verifiable)

#### **Step 2: Prompt Hashing**
```typescript
Prompt + Nonce + Timestamp → SHA-256 → Prompt Hash
"a cat" + "abc123" + "2025-11-05T12:00:00Z" → hash
```
- Links the prompt to specific generation instance
- Prevents prompt tampering

#### **Step 3: Chain-of-Trust Hash**
```typescript
ContentHash + PromptHash + WalletAddress + Timestamp + Nonce → ChainOfTrustHash
```
- Cryptographically binds all elements together
- Single hash represents entire generation event

#### **Step 4: MetaMask Signature (EIP-191)**
```typescript
Message = ChainOfTrustHash
Signature = MetaMask.sign(Message, PrivateKey)
```
- User's private key signs the chain-of-trust
- Only the wallet owner can produce this signature
- Proves identity without revealing private key

#### **Step 5: Certificate Creation**
```json
{
  "version": "1.0",
  "timestamp": "2025-11-05T18:05:43Z",
  "nonce": "a4a764ad4c...",
  "walletAddress": "0x161975777d...",
  "contentCID": "QmQEK...urLWE",
  "biometricImageCID": "QmRjS...8DxwQ",
  "contentHash": "d83a0a8f...",
  "promptHash": "9bdd1bc856...",
  "cryptographicProof": {
    "signature": "0xb7e9f398c...",
    "chainOfTrustHash": "62f895dab...",
    "algorithm": "EIP-191"
  }
}
```

#### **Step 6: IPFS Upload**
- Certificate → IPFS → Certificate CID
- Certificate CID becomes permanent proof
- Anyone can verify by fetching from IPFS

---

## 🔄 Complete Workflow

### **Phase 1: Content Generation**

#### **Text Generation Flow**
```
User → Enter Prompt → OpenRouter API → AI Response → Display
```

1. User navigates to `/chat`
2. Enters text prompt: "Explain quantum computing"
3. Frontend sends to `/api/openrouter`
4. Server-side proxy calls OpenRouter API
5. AI generates response
6. Response displayed to user
7. "Notarize & Protect" button appears

#### **Image Generation Flow**
```
User → Enter Prompt → Puter.js → AI Image → Display
```

1. User navigates to `/image`
2. Signs in to Puter (required)
3. Enters image prompt: "A serene Japanese garden"
4. Puter.js API generates image
5. Image converted to blob and data URL
6. Image displayed in gallery
7. "Notarize & Protect" button appears

---

### **Phase 2: Notarization Process**

#### **Step-by-Step Notarization**

**1. User Clicks "Notarize & Protect"**
```
Button Click → Check Wallet → Show Consent Modal
```
- Validates MetaMask connection
- If not connected, prompts user to connect

**2. Biometric Consent**
```
Consent Modal → User Reads Terms → Checkbox → "I Accept"
```
- User sees explicit consent form
- Explains biometric data will be on IPFS
- Warns data is permanent and public
- User must check agreement box

**3. Webcam Capture**
```
Accept → Open Webcam → Show Live Feed → "Capture Photo"
```
- Browser requests camera permission
- Live video feed displayed
- User clicks capture when ready
- Photo converted to PNG blob

**4. Cryptographic Processing**
```javascript
// Generate unique identifiers
nonce = generateNonce() // "a4a764ad4c..."
timestamp = getTimestamp() // "2025-11-05T18:05:43Z"

// Hash the content
contentHash = SHA256(content) // "d83a0a8f..."

// Hash the prompt
promptData = prompt + "||" + nonce + "||" + timestamp
promptHash = SHA256(promptData) // "9bdd1bc856..."

// Create chain of trust
chainOfTrust = contentHash + promptHash + wallet + timestamp + nonce
chainOfTrustHash = SHA256(chainOfTrust) // "62f895dab..."

// Get MetaMask signature
signature = await MetaMask.sign(chainOfTrustHash) // "0xb7e9f398c..."
```

**5. IPFS Upload**
```
Content → Pinata → Content CID
Biometric → Pinata → Biometric CID
Certificate → Pinata → Certificate CID
```

Parallel uploads:
- Content file: "QmQEK...urLWE"
- Biometric image: "QmRjS...8DxwQ"
- Certificate JSON: "QmPJ6...GRqzz"

**6. Local Storage**
```javascript
certificateRef = {
  id: "cert_1730000000_abc123",
  certificateCID: "QmPJ6...GRqzz",
  contentCID: "QmQEK...urLWE",
  walletAddress: "0x161975777d...",
  timestamp: "2025-11-05T18:05:43Z",
  type: "image"
}
localStorage.set("notarization_certificate_refs", [certificateRef])
```

**7. Success Display**
```
Show Success UI with:
- ✅ Notarized badge
- 🔗 Content link (IPFS)
- 📜 Certificate link (IPFS)
- ⬇️ Download button
- 💎 Mint as NFT button
```

---

### **Phase 3: Certificate Management**

#### **Viewing Certificates**

**Load Certificates**
```
Page Load → Sync from Pinata → Fetch from IPFS → Display
```

1. User visits `/certificates`
2. App syncs with Pinata API:
   ```javascript
   certificates = await fetch("https://api.pinata.cloud/data/pinList")
   filter(name.startsWith("certificate-"))
   ```
3. For each certificate CID:
   - Fetch JSON from IPFS
   - Extract metadata
   - Load content preview
4. Display in grid with filters

**Certificate Details Modal**
```
Click "View" → Fetch Full Data → Display Modal
```
- Shows content preview (image or text)
- All cryptographic proofs
- IPFS links
- Wallet address
- Timestamp
- Download PDF option

#### **Certificate Verification**

Anyone can verify a certificate:
1. Get certificate CID
2. Fetch from IPFS: `https://gateway.pinata.cloud/ipfs/{CID}`
3. Extract signature and chain-of-trust hash
4. Verify signature matches wallet address
5. Recalculate hashes to verify integrity

---

### **Phase 4: Content Download**

#### **Image Download**
```
Click Download → Create Object URL → Trigger Download
```
```javascript
const url = URL.createObjectURL(imageBlob)
const link = document.createElement("a")
link.href = url
link.download = "notarized-image-{timestamp}.png"
link.click()
```

#### **Text to PNG Conversion**
```
Click Download → Render to Canvas → Convert to PNG → Download
```
```javascript
1. Create canvas
2. Set dimensions based on text length
3. Word-wrap text (800px width)
4. Render text with dark background
5. Convert canvas.toBlob()
6. Download as PNG
```

---

### **Phase 5: NFT Minting**

#### **Mintable Integration**

**User Flow**
```
Click "Mint as NFT" → Open Modal → Iframe Mintable → Create NFT
```

**Modal Features**
- Full-screen iframe to Mintable.com/mint
- Fallback for blocked iframes
- Instructions to use IPFS CID
- Direct link if iframe fails

**NFT Metadata Suggestion**
```json
{
  "name": "AI Generated Content",
  "description": "Cryptographically notarized AI art",
  "image": "ipfs://{contentCID}",
  "external_url": "https://gateway.pinata.cloud/ipfs/{certificateCID}",
  "attributes": [
    {"trait_type": "Certificate", "value": "{certificateCID}"},
    {"trait_type": "Creator", "value": "{walletAddress}"},
    {"trait_type": "Model", "value": "gpt-image-1-mini"},
    {"trait_type": "Notarized", "value": "true"}
  ]
}
```

**Why This Matters**
- NFT points to IPFS content (permanent)
- Certificate embedded as metadata
- Verifiable on-chain ownership
- Resale royalties possible

---

## 🗂️ Project Structure

```
ps5/
├── app/
│   ├── layout.tsx              # Root layout with metadata
│   ├── page.tsx                # Home page (mode selection)
│   ├── chat/
│   │   └── page.tsx            # Text generation interface
│   ├── image/
│   │   └── page.tsx            # Image generation interface
│   ├── certificates/
│   │   └── page.tsx            # Certificate dashboard
│   └── api/
│       └── openrouter/
│           └── route.ts        # Server-side OpenRouter proxy
│
├── components/
│   ├── MetaMaskButton.tsx      # Wallet connection
│   ├── NotarizationButton.tsx  # Main notarization UI
│   ├── ConsentModal.tsx        # Biometric consent form
│   ├── WebcamCapture.tsx       # Camera capture interface
│   ├── CertificateViewer.tsx   # Certificate details modal
│   ├── MintableModal.tsx       # NFT minting iframe
│   ├── HelpBot.tsx             # Kalki bot integration
│   └── DarkVeil.tsx            # Visual effects
│
├── lib/
│   ├── notarization.ts         # Crypto & IPFS functions
│   ├── certificateStorage.ts   # Certificate CRUD & sync
│   ├── pdfGenerator.ts         # PDF certificate creation
│   └── verification.ts         # Signature verification
│
├── .env.local                  # Environment variables
├── package.json                # Dependencies
├── tsconfig.json               # TypeScript config
└── tailwind.config.ts          # Tailwind config
```

---

## 🔑 Key Features

### **1. Dual AI Generation**
- Text: GPT-based language model
- Image: Diffusion-based image generator
- Server-side proxying for API security
- Real-time generation feedback

### **2. Cryptographic Notarization**
- SHA-256 content hashing
- EIP-191 MetaMask signatures
- Chain-of-trust verification
- Nonce-based replay protection
- Timestamp authentication

### **3. Decentralized Storage**
- IPFS content addressing
- Pinata permanent pinning
- Public gateway access
- Automatic sync from Pinata

### **4. Blockchain Integration**
- MetaMask wallet connection
- Personal message signing
- Wallet-based authentication
- EIP-191 standard compliance

### **5. Certificate System**
- Complete generation metadata
- Cryptographic proof bundle
- Biometric verification image
- PDF export capability
- IPFS permanent storage

### **6. NFT Marketplace**
- Mintable integration
- Iframe embedding
- IPFS metadata linking
- One-click minting flow

---

## 🚀 Getting Started

### **Prerequisites**
```bash
Node.js 18+
npm or yarn
MetaMask browser extension
```

### **Installation**
```bash
# Clone repository
git clone https://github.com/rksingh-dev/CODEUTSAVA-9.0.git
cd ps5

# Install dependencies
npm install

# Create environment file
cp .env.local.example .env.local

# Add your API keys to .env.local
OPENROUTER_API_KEY=your_key_here
NEXT_PUBLIC_PINATA_API_KEY=your_key_here
NEXT_PUBLIC_PINATA_API_SECRET=your_secret_here
NEXT_PUBLIC_PINATA_JWT=your_jwt_here
```

### **Development**
```bash
npm run dev
# Open http://localhost:3000
```

### **Production Build**
```bash
npm run build
npm start
```

---

## 📊 Data Flow Diagram

```
┌─────────────┐
│    User     │
└──────┬──────┘
       │
       ├──────────────────────────────────────┐
       │                                      │
       ▼                                      ▼
┌─────────────┐                      ┌──────────────┐
│ Text Prompt │                      │ Image Prompt │
└──────┬──────┘                      └──────┬───────┘
       │                                     │
       ▼                                     ▼
┌─────────────┐                      ┌──────────────┐
│  OpenRouter │                      │   Puter.js   │
│     API     │                      │     API      │
└──────┬──────┘                      └──────┬───────┘
       │                                     │
       └──────────────┬──────────────────────┘
                      │
                      ▼
              ┌───────────────┐
              │  AI Content   │
              └───────┬───────┘
                      │
                      ▼
         ┌────────────────────────┐
         │ Notarize & Protect     │
         │ Button Clicked         │
         └────────┬───────────────┘
                  │
                  ▼
         ┌────────────────────────┐
         │  MetaMask Connected?   │
         └────────┬───────────────┘
                  │ Yes
                  ▼
         ┌────────────────────────┐
         │  Consent Modal         │
         │  (Biometric Agreement) │
         └────────┬───────────────┘
                  │ Accept
                  ▼
         ┌────────────────────────┐
         │  Webcam Capture        │
         │  (Take Photo)          │
         └────────┬───────────────┘
                  │
                  ▼
         ┌────────────────────────┐
         │  Generate Hashes       │
         │  - Content Hash        │
         │  - Prompt Hash         │
         │  - Chain of Trust      │
         └────────┬───────────────┘
                  │
                  ▼
         ┌────────────────────────┐
         │  MetaMask Signature    │
         │  (EIP-191)             │
         └────────┬───────────────┘
                  │
                  ▼
         ┌────────────────────────┐
         │  Upload to IPFS        │
         │  via Pinata            │
         │  - Content             │
         │  - Biometric Image     │
         │  - Certificate         │
         └────────┬───────────────┘
                  │
                  ▼
         ┌────────────────────────┐
         │  Receive CIDs          │
         │  - Content CID         │
         │  - Biometric CID       │
         │  - Certificate CID     │
         └────────┬───────────────┘
                  │
                  ▼
         ┌────────────────────────┐
         │  Save to localStorage  │
         │  (Reference Only)      │
         └────────┬───────────────┘
                  │
                  ▼
         ┌────────────────────────┐
         │  Success Display       │
         │  - View Links          │
         │  - Download Button     │
         │  - Mint NFT Button     │
         └────────────────────────┘
```

---

## 🔒 Security Considerations

### **Private Keys**
- ✅ Never leave device (MetaMask manages)
- ✅ Signing happens client-side
- ✅ Private key never sent to server

### **API Keys**
- ⚠️ OpenRouter key in server-side API route
- ⚠️ Pinata JWT exposed in client (read-only operations)
- ✅ Use environment variables

### **Data Privacy**
- ⚠️ All IPFS data is PUBLIC
- ⚠️ Biometric images are PERMANENT
- ✅ Users explicitly consent
- ✅ Clear warnings displayed

### **Signature Verification**
- ✅ Anyone can verify signatures
- ✅ Wallet address proves ownership
- ✅ Cannot forge signatures without private key

---

## 🌐 API Reference

### **OpenRouter Endpoint**
```
POST /api/openrouter
Content-Type: application/json

{
  "model": "openai/gpt-oss-20b:free",
  "messages": [
    {"role": "user", "content": "Hello"}
  ]
}
```

### **Pinata File Upload**
```
POST https://api.pinata.cloud/pinning/pinFileToIPFS
Authorization: Bearer {JWT}
Content-Type: multipart/form-data

file: <binary>
```

### **Pinata JSON Upload**
```
POST https://api.pinata.cloud/pinning/pinJSONToIPFS
Authorization: Bearer {JWT}
Content-Type: application/json

{
  "pinataContent": {...},
  "pinataMetadata": {
    "name": "certificate-123"
  }
}
```

### **Pinata List Files**
```
GET https://api.pinata.cloud/data/pinList?status=pinned
Authorization: Bearer {JWT}
```

---

## 🎨 UI/UX Features

- **Dark Theme**: Modern gradient backgrounds
- **Responsive**: Mobile-first design
- **Real-time**: Live generation feedback
- **Modals**: Portal-based overlays
- **Animations**: Smooth transitions
- **Accessibility**: Keyboard navigation
- **Loading States**: Clear progress indicators

---

## 📝 Environment Variables

```env
# OpenRouter API
OPENROUTER_API_KEY=sk-or-v1-xxx
NEXT_PUBLIC_OPENROUTER_API_KEY=sk-or-v1-xxx

# Pinata IPFS
NEXT_PUBLIC_PINATA_API_KEY=xxx
NEXT_PUBLIC_PINATA_API_SECRET=xxx
NEXT_PUBLIC_PINATA_JWT=eyJxxx
```

---

## 🐛 Known Issues & Limitations

### **IPFS Challenges**
- Initial load can be slow
- Gateway timeouts possible
- Content addressing learning curve

### **Puter.js**
- Requires user sign-in
- Rate limits on free tier
- Limited model options

### **MetaMask**
- Browser extension required
- Mobile support varies
- Network switching needed

### **Mintable**
- Iframe may be blocked
- Requires manual metadata entry
- Gas fees for minting

---

## 🔮 Future Enhancements

### **Planned Features**
1. **Multi-chain Support**: Polygon, Solana, etc.
2. **Advanced AI Models**: DALL-E, Midjourney integration
3. **Batch Notarization**: Multiple items at once
4. **Social Sharing**: Twitter, Discord integration
5. **Marketplace**: Built-in NFT marketplace
6. **Collaboration**: Team workspaces
7. **Analytics**: Usage statistics dashboard
8. **Smart Contracts**: On-chain verification

### **Technical Improvements**
- WebAssembly for faster hashing
- Service Worker for offline support
- GraphQL for efficient queries
- Redis caching layer
- CDN for static assets

---

## 👥 Team & Credits

**Team Kalki**
- Platform Development
- Cryptographic Implementation
- UI/UX Design

**Technologies**
- Next.js Team
- OpenRouter
- Puter.js
- Pinata
- MetaMask
- Mintable

---

## 📄 License

This project is part of CODEUTSAVA 9.0 hackathon submission.

---

## 🆘 Support

For issues and questions:
- GitHub Issues: [Create Issue](https://github.com/rksingh-dev/CODEUTSAVA-9.0/issues)
- Documentation: This README
- Help Bot: Integrated Kalki bot in app

---

## 🎓 Educational Resources

### **Learn More**
- [IPFS Documentation](https://docs.ipfs.io/)
- [Pinata Docs](https://docs.pinata.cloud/)
- [EIP-191 Standard](https://eips.ethereum.org/EIPS/eip-191)
- [Next.js Docs](https://nextjs.org/docs)
- [MetaMask Docs](https://docs.metamask.io/)
- [NFT Standards](https://ethereum.org/en/nft/)

---

**Built with ❤️ for CODEUTSAVA 9.0 by Team Kalki**

*Empowering creators with verifiable AI content ownership through blockchain and decentralized storage.*
`
  }
];

// Function to chunk documents into smaller pieces for better retrieval
export function chunkDocument(content: string, chunkSize: number = 500): string[] {
  const sentences = content.split(/[.!?]\s+/);
  const chunks: string[] = [];
  let currentChunk = '';

  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > chunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk += (currentChunk ? '. ' : '') + sentence;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

// Get all document chunks with metadata
export function getAllChunks() {
  const allChunks: Array<{ content: string; docId: string; docTitle: string }> = [];

  for (const doc of documents) {
    const chunks = chunkDocument(doc.content);
    chunks.forEach(chunk => {
      allChunks.push({
        content: chunk,
        docId: doc.id,
        docTitle: doc.title
      });
    });
  }

  return allChunks;
}
