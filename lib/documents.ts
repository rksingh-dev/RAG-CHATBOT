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
Certainly! Below is a detailed breakdown of the **workflow** for the AI Content Notarization & NFT Platform, from content generation to minting an NFT.

---

### **AI Content Notarization & NFT Platform Workflow**

#### **Phase 1: Content Generation**

1. **User Interaction with the Platform**

   * The user navigates to the platform’s home page (`/`), where they can choose whether they want to generate **text** or **image** content.
   * **Text Generation**: The user enters a prompt such as "Explain quantum computing" in the provided input field.
   * **Image Generation**: The user enters a prompt like "A serene Japanese garden" in the image input field.

2. **Sending the Prompt to the API**

   * The frontend sends the entered prompt to the respective server-side API endpoint.
   * For **text generation**, the prompt is sent to the **OpenRouter API**, which uses the GPT-based language model to generate the text.
   * For **image generation**, the prompt is sent to **Puter.js**, which generates an image based on the provided description.

3. **Displaying AI Output**

   * The AI-generated content is returned from the respective API:

     * **Text Output**: Displayed on the page.
     * **Image Output**: Displayed as an image on the page.

4. **Enable Notarization Option**

   * Once the AI content (text or image) is displayed, the user is given the option to **Notarize & Protect** the content by clicking a button.

---

#### **Phase 2: Notarization Process**

1. **User Clicks "Notarize & Protect" Button**

   * Upon clicking the "Notarize & Protect" button, the platform checks if the user is logged in with **MetaMask**.
   * If **MetaMask** is not connected, the user is prompted to connect their wallet.

2. **Biometric Consent**

   * The platform opens a **Consent Modal** that explains the terms and conditions.
   * The user is informed that their **biometric image** will be captured and stored permanently on IPFS, and they must explicitly agree by checking a consent box.

3. **Webcam Capture**

   * After agreeing to the terms, the user’s **webcam** is activated.
   * The user captures a **biometric image** (photo) via the live webcam feed. This image will be associated with the content for **identity verification**.

4. **Generating Cryptographic Proof**

   * The platform generates a **cryptographic hash** of the content (SHA-256) and the **prompt** using the current **nonce** and **timestamp**.
   * A **chain-of-trust hash** is created by combining the **content hash**, **prompt hash**, **wallet address**, **timestamp**, and **nonce**.
   * The **MetaMask wallet** signs the **chain-of-trust hash** using the user’s private key, ensuring cryptographic proof of ownership and creation.

5. **Certificate Creation**

   * A **certificate** is generated, containing the following data:

     * **Timestamp** of the notarization
     * **Wallet address** of the creator
     * **Content CID** (IPFS content identifier)
     * **Biometric image CID** (IPFS reference for the biometric photo)
     * **Cryptographic proof** (signature and chain-of-trust hash)

6. **Upload to IPFS**

   * The **content** (text or image), **biometric image**, and **certificate** are uploaded to **IPFS** through the **Pinata** service.
   * Each file (content, biometric image, and certificate) receives a unique **CID** upon upload.
   * The CIDs are then used to reference the content, ensuring the files are securely stored and accessible through the IPFS network.

---

#### **Phase 3: Displaying the Notarization**

1. **Success Display**

   * Once the notarization is complete and the files are successfully uploaded to IPFS, the user is shown a **success UI** that displays:

     * A **Notarized badge** indicating the content is authenticated.
     * Links to the **content** and **certificate** (stored on IPFS).
     * A **download button** allowing the user to download the notarized content.
     * A **Mint as NFT button** enabling the user to mint the notarized content as an NFT.

2. **Certificate Verification**

   * The platform allows users to verify the **certificate** by fetching the **CID** from IPFS.
   * The user can check the authenticity of the certificate by validating the **cryptographic signature**, ensuring that the signature matches the **wallet address** and that the content hasn’t been tampered with.

---

#### **Phase 4: NFT Minting**

1. **Minting the Content as an NFT**

   * After the content is notarized, the user can click the **Mint as NFT button**.
   * A modal opens, showing an **iframe** containing the Mintable platform for NFT creation.
   * The user can mint the content as an **NFT** by entering the content’s **CID** (for the image or text) and the **certificate’s CID** (for the cryptographic proof).

2. **Mintable Platform**

   * The Mintable iframe integrates seamlessly into the platform, allowing users to mint NFTs without leaving the site.
   * Once the user confirms the NFT minting, the content is permanently tied to the blockchain, and the user is issued an **NFT token** representing ownership of the content.

3. **NFT Metadata**

   * The NFT metadata includes:

     * The **name** and **description** of the content (e.g., "AI-Generated Art").
     * **Image URL**: The **CID** pointing to the IPFS file for the content.
     * **External URL**: A link to the certificate’s IPFS CID.
     * **Attributes**: Additional metadata such as creator wallet address, content model (e.g., GPT or Puter.js), and notarization status.

---

#### **Phase 5: Certificate Management**

1. **Viewing and Managing Certificates**

   * The user can visit the **Certificates Page**, which lists all the notarized content and associated certificates.
   * For each certificate, users can view:

     * The **content preview** (text or image).
     * The **cryptographic proofs** (signature and chain-of-trust).
     * The **IPFS links** for the content and certificate.
     * A **download PDF** option for saving the certificate locally.

2. **Certificate Verification**

   * The platform provides a feature where anyone can verify the authenticity of the content and its certificate:

     1. Retrieve the **certificate CID**.
     2. Fetch the certificate data from IPFS.
     3. Check the **cryptographic proof** against the wallet address and the content.

---

#### **Phase 6: Content Download**

1. **Downloading the Content**

   * The user can download the notarized content (image or text) by clicking the **Download button**.
   * **Images** are downloaded as PNG files using the **Blob URL** method.
   * **Text content** can be converted into PNG format for download via a **Canvas-to-PNG** conversion method.

---

### **Summary of the Workflow**

* **Content Generation**: Users generate AI content (text or image) via OpenRouter API or Puter.js.
* **Notarization**: The content is notarized by capturing a biometric photo, generating cryptographic hashes, and signing with MetaMask.
* **IPFS Upload**: Content, biometric photo, and certificate are uploaded to IPFS for permanent storage.
* **NFT Minting**: Notarized content is minted as an NFT on Mintable, and the ownership is recorded on the blockchain.
* **Certificate Management**: Users can view and verify certificates for content authenticity.
* **Download & Share**: Users can download the content or share it as an NFT.

This detailed workflow ensures that AI-generated content is authenticated, securely stored, and easily transferred as a unique digital asset.

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
