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
    content: `Here's a Wikipedia-style explanation of the important terminology and features based on your project:

---

### AI Content Notarization & NFT Platform

#### Overview

The **AI Content Notarization & NFT Platform** is a decentralized web platform that generates AI-driven content such as text and images, notarizes it using cryptographic proofs, and enables the creation of NFTs (Non-Fungible Tokens) to verify ownership and authenticity. The platform uses cutting-edge technologies such as blockchain, IPFS (InterPlanetary File System), and cryptographic signatures to provide content creators with secure, verifiable ownership of AI-generated works.

---

### Key Terminology

#### 1. **AI Content Generation**

AI content generation involves the use of artificial intelligence (AI) models to automatically create text or images based on user input. In the platform:

* **Text Generation**: Powered by **OpenRouter API** (GPT-based language models), the platform generates human-like text content from user prompts.
* **Image Generation**: Utilizing **Puter.js v2** (a diffusion-based text-to-image model), the platform converts textual descriptions into images, providing creators with visual content that matches the given prompts.

---

#### 2. **Blockchain & Web3 Technologies**

**Blockchain** is a decentralized, immutable ledger used to store data in a secure and transparent manner. In the platform, blockchain technology is employed to provide ownership verification and trace the provenance of AI-generated content.

* **MetaMask**: A browser extension wallet that connects the platform to the Ethereum blockchain. Users authenticate and sign messages with their MetaMask wallet for secure transactions.
* **EIP-191**: A standard for signing personal messages in Ethereum, used here for signing content generation and ownership data, ensuring cryptographic proof of ownership.

---

#### 3. **NFT (Non-Fungible Token)**

An **NFT** is a unique digital asset stored on a blockchain that represents ownership of a specific item. In this platform, NFTs are created for AI-generated content, linking the ownership and authenticity of digital works to the blockchain.

* **Mintable**: A user-friendly NFT marketplace integrated into the platform that allows users to mint NFTs with a simple click. The NFTs contain metadata such as the content's CID (Content Identifier), creator's wallet address, and certificate data stored on IPFS.

---

#### 4. **IPFS (InterPlanetary File System)**

**IPFS** is a decentralized file storage system that enables the distribution of files across a peer-to-peer network. It is used in the platform to store the AI-generated content and its associated metadata in a distributed manner.

* **Content Addressing**: Files in IPFS are identified by their content rather than their location. Each file is assigned a unique cryptographic hash (CID).
* **Pinning**: To ensure that files remain available on IPFS, services like **Pinata** are used to pin the files. Pinning ensures that the files are stored permanently and accessible.

---

#### 5. **Cryptographic Notarization**

**Cryptographic notarization** is the process of using cryptography to prove the authenticity and ownership of a piece of content. The platform uses this method to ensure that AI-generated content cannot be altered or disputed.

* **SHA-256**: A cryptographic hash function used to create a unique representation (hash) of the content. Any modification to the content will result in a completely different hash, proving if it has been altered.
* **EIP-191 Signatures**: A cryptographic proof mechanism where a user signs the chain-of-trust hash using their MetaMask wallet. This provides verifiable proof that the content was created by the owner of the wallet and is associated with a specific timestamp.

---

#### 6. **Pinata (IPFS Pinning Service)**

**Pinata** is a service that facilitates the permanent storage (pinning) of files on IPFS. It ensures that the files, including images, certificates, and other content, are always available by continuously hosting them.

* **Pinning API**: Pinata provides APIs to upload and pin files to IPFS. These files receive a unique CID, which can be used to reference the content.
* **Gateway Access**: Files stored on IPFS can be accessed via a public gateway, allowing anyone to view the content without the need for a specialized IPFS client.

---

#### 7. **Notarization Process**

The **Notarization Process** ensures the AI-generated content is cryptographically verified and tied to the creator's identity. This process includes several steps:

1. **Content Hashing**: The content is hashed using SHA-256 to create a unique representation.
2. **Prompt Hashing**: The prompt used to generate the content is also hashed and linked to the content.
3. **Chain-of-Trust Hash**: The content hash, prompt hash, and user wallet address are combined to form a chain-of-trust hash, which is signed by the user using MetaMask.
4. **Certificate Creation**: The notarization details, including cryptographic proofs, are stored as a certificate, which is uploaded to IPFS for public verification.

---

#### 8. **Certificate Management**

Once content is notarized, a **certificate** is generated that contains metadata such as:

* The content's CID
* The biometric image (if biometric consent is provided)
* The wallet address of the creator
* Cryptographic proofs (signatures and hash links)

These certificates are stored on IPFS, ensuring their permanence and immutability. Anyone can verify the certificate and content by accessing the certificate's CID and checking the cryptographic proofs.

---

#### 9. **Minting as NFT**

Once the content is notarized, it can be **minted** as an NFT on the **Mintable** platform. The NFT is a digital representation of the content that includes metadata such as:

* The content's CID (IPFS reference)
* The certificate's CID
* The creator's wallet address
* Model used to generate the content

Minting the content as an NFT allows creators to sell, trade, or showcase their work, with the blockchain providing a permanent record of ownership and provenance.

---

### Conclusion

The AI Content Notarization & NFT Platform integrates the power of **AI** with **blockchain** and **decentralized storage** to ensure creators can generate, authenticate, and prove ownership of digital works in a secure, verifiable, and permanent manner. By utilizing technologies like **IPFS**, **MetaMask**, **Mintable**, and **cryptographic notarization**, the platform offers a robust solution for the growing intersection of AI and digital art.

---

This explanation summarizes key concepts and processes of the platform to provide a clear understanding of its architecture and functionality.
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
