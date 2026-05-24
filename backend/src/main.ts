import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import {
  getListenHost,
  isAllowedDevFrontendOrigin,
} from './common/network-utils';

function getAllowedOrigins(): string[] {
  const raw = process.env.FRONTEND_URL ?? 'http://localhost:3000';
  return raw
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

async function bootstrap() {
  if (process.env.NODE_ENV === 'production' && !process.env.API_KEY) {
    throw new Error('API_KEY environment variable is required in production');
  }

  const app = await NestFactory.create(AppModule);
  const allowedOrigins = getAllowedOrigins();
  const allowPrivateDevOrigins = process.env.NODE_ENV !== 'production';

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (error: Error | null, allow?: boolean) => void,
    ) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      if (allowPrivateDevOrigins && isAllowedDevFrontendOrigin(origin)) {
        callback(null, true);
        return;
      }

      callback(null, false);
    },
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.setGlobalPrefix('api');

  const config = new DocumentBuilder()
    .setTitle('Alpha Ledger API')
    .setDescription('Personal finance tracker API')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = Number(process.env.PORT ?? 3001);
  const host = getListenHost();
  await app.listen(port, host);

  console.log(`Alpha Ledger API: http://127.0.0.1:${port}/api`);
  if (host === '0.0.0.0' && !process.env.API_KEY) {
    console.warn(
      'Warning: API is reachable on the network without API_KEY. Set API_KEY for LAN/mobile access.',
    );
  }
  if (host === '0.0.0.0') {
    console.log(
      `Mobile/hotspot: on your phone, open http://<this-laptop-ip>:3000 (same Wi‑Fi or hotspot)`,
    );
  }
}
bootstrap();
