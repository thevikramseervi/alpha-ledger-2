import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { timingSafeEqual } from 'crypto';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const requiredKey = process.env.API_KEY;
    if (!requiredKey) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
    }>();
    const providedKey = request.headers['x-api-key'];

    if (providedKey && this.keysMatch(providedKey, requiredKey)) {
      return true;
    }

    throw new UnauthorizedException('Invalid or missing API key');
  }

  private keysMatch(provided: string, required: string): boolean {
    const providedBuffer = Buffer.from(provided);
    const requiredBuffer = Buffer.from(required);

    if (providedBuffer.length !== requiredBuffer.length) {
      return false;
    }

    return timingSafeEqual(providedBuffer, requiredBuffer);
  }
}
