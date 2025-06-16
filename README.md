npm i# Unowned Frontend

## Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# AWS Configuration
NEXT_PUBLIC_AWS_REGION=your-aws-region
NEXT_PUBLIC_AWS_API_ENDPOINT=your-api-endpoint
```

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Authentication

The application uses Supabase for authentication. Make sure to:

1. Set up a Supabase project
2. Configure the authentication providers in your Supabase dashboard
3. Add the Supabase URL and anon key to your environment variables

## API Integration

The frontend integrates with AWS Lambda functions through API Gateway. Make sure to:

1. Deploy your Lambda functions
2. Set up API Gateway endpoints
3. Add the AWS region and API endpoint to your environment variables
