import 'dotenv/config';
import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import {
  checkGeminiStatus,
  analyzeIncidentReport,
  evaluateSafeRoute,
  generateTacticalAdvice,
  generateCommunitySummary,
} from './src/services/gemini/geminiServer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  const isProduction = process.env.NODE_ENV === 'production';

  app.use(express.json());

  // ==========================================
  // RUTAS DE LA API GEMINI (SERVER-SIDE PROXY)
  // ==========================================

  // Estado del servicio
  app.get('/api/gemini/status', async (_req: Request, res: Response) => {
    try {
      const status = await checkGeminiStatus();
      res.json(status);
    } catch (error) {
      console.error('[API Gemini] Error verificando estado:', error);
      res.status(500).json({ error: 'Error interno al consultar estado de Gemini' });
    }
  });

  // Análisis inteligente de incidentes
  app.post('/api/gemini/analyze-incident', async (req: Request, res: Response) => {
    try {
      const result = await analyzeIncidentReport(req.body);
      res.json(result);
    } catch (error) {
      console.error('[API Gemini] Error en análisis de incidente:', error);
      res.status(500).json({ error: 'Error analizando incidente con Gemini' });
    }
  });

  // Evaluación de rutas seguras
  app.post('/api/gemini/evaluate-route', async (req: Request, res: Response) => {
    try {
      const result = await evaluateSafeRoute(req.body);
      res.json(result);
    } catch (error) {
      console.error('[API Gemini] Error evaluando ruta segura:', error);
      res.status(500).json({ error: 'Error evaluando ruta con Gemini' });
    }
  });

  // Consejos y protocolos tácticos
  app.post('/api/gemini/tactical-advice', async (req: Request, res: Response) => {
    try {
      const result = await generateTacticalAdvice(req.body);
      res.json(result);
    } catch (error) {
      console.error('[API Gemini] Error en asesoría táctica:', error);
      res.status(500).json({ error: 'Error generando asesoría táctica con Gemini' });
    }
  });

  // Resumen situacional comunitario
  app.post('/api/gemini/community-summary', async (req: Request, res: Response) => {
    try {
      const result = await generateCommunitySummary(req.body);
      res.json(result);
    } catch (error) {
      console.error('[API Gemini] Error en resumen comunitario:', error);
      res.status(500).json({ error: 'Error generando resumen comunitario con Gemini' });
    }
  });

  // ==========================================
  // VITE DEV SERVER O STATIC ASSETS EN PRODUCCIÓN
  // ==========================================
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Security Urban] Servidor ejecutándose en http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[Security Urban] Fallo al iniciar servidor:', err);
});
