# TextTalk - A Modern Fullstack Platform

Built with the Next.js 14.0 App Router, tRPC, TypeScript, Prisma & Tailwind



## Features

- 🛠️ Complete SaaS Built From Scratch
- 💻 Beautiful Landing Page & Pricing Page Included
- 💳 Free & Pro Plan Using Stripe
- 📄 A Beautiful And Highly Functional PDF Viewer
- 🔄 Streaming API Responses in Real-Time
- 🔒 Authentication Using clerk
- 🎨 Clean, Modern UI Using 'shadcn-ui'
- 🚀 Optimistic UI Updates for a Great UX
- ⚡ Infinite Message Loading for Performance
- 📤 Intuitive Drag n’ Drop Uploads
- ✨ Instant Loading States
- 🔧 Modern Data Fetching Using tRPC & Zod
- 🧠 LangChain for Infinite AI Memory
- 🌲 Pinecone as our Vector Storage
- 📊 Prisma as our ORM
- 🔤 100% written in TypeScript
- 🎁 ...much more


## Getting Started

Follow these steps to set up and run the project locally:

### 1. Clone the repository

```bash
git clone https://github.com/Abdullah-dev0/TextTalk.git
cd texttalk
```

### 2. Install dependencies

Make sure you have all the dependencies installed by running:

```bash
npm install
```

### 3. Set up environment variables

1. Duplicate the `.env.example` file and rename it to `.env`.

2. Fill in the required environment variables in the `.env` file:

   - **Clerk** for secure authentication (see [Clerk documentation](https://clerk.dev))
     ```plaintext
     NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
     CLERK_SECRET_KEY=
     NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
     NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
     NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL=/dashboard
     NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL=/dashboard
     ```

   - **Database** MongoDB connection (replace <your-mongodb-uri> with your MongoDB connection URI)
     ```plaintext
     DATABASE_URL=
     ```

   - **Uploadthing** for PDF storage (see [Uploadthing documentation](https://uploadthing.com/dashboard))
     ```plaintext
     UPLOADTHING_SECRET=
     UPLOADTHING_APP_ID=
     UPLOADTHING_TOKEN=
     ```

   - **OpenAI** or **Mistral API** for answering questions from PDFs (see [OpenAI](https://platform.openai.com/))
     ```plaintext
     OPENAI_API_KEY=
     ```

   - **Pinecone** for vector storage
     ```plaintext
     PINECONE_API_KEY=
     ```

### 4. Start the development server

Once the environment variables are configured, start the server:

```bash
npm run dev
```

### 5. Access the application

Open your browser and navigate to `http://localhost:3000` to view the application.

---



