import { registerAs } from "@nestjs/config";

export default registerAs("cors", () => {
  const frontendUrl = process.env.FRONTEND_URL;
  const frontendUrlWww = process.env.FRONTEND_URL_WWW;

  const origins = ["http://localhost:5173", frontendUrl, frontendUrlWww].filter(
    Boolean,
  );

  return {
    origin: origins,
    credentials: false,
    methods: "GET,HEAD,POST",
    allowedHeaders: "Content-Type,Accept",
  };
});
