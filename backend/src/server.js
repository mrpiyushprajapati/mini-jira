import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

// Prisma 7 requires a non-empty options object
const prisma = new PrismaClient({});

app.use(cors());
app.use(express.json());

const PRIORITIES = ['Low', 'Medium', 'High'];
const STATUSES = ['Open', 'In Progress', 'Resolved', 'Closed'];

// Simple async error wrapper
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Auth middleware
const authenticate = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Missing or invalid Authorization header' });
  }
  const token = header.slice('Bearer '.length);
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

async function seedDefaultsIfEmpty() {
  const [userCount, projectCount] = await Promise.all([prisma.user.count(), prisma.project.count()]);

  if (userCount === 0) {
    const hash = await bcrypt.hash('Password@123', 10);
    await prisma.user.createMany({
      data: [
        { name: 'Admin User', email: 'admin@minijira.local', password: hash, role: 'admin' },
        { name: 'Jane Dev', email: 'jane@minijira.local', password: hash, role: 'user' },
        { name: 'John QA', email: 'john@minijira.local', password: hash, role: 'user' },
      ],
    });
  }

  if (projectCount === 0) {
    await prisma.project.createMany({
      data: [
        { name: 'Mini Jira', key: 'MJ' },
        { name: 'Website Revamp', key: 'WEB' },
      ],
    });
  }
}

// Health
app.get(
  '/api/health',
  asyncHandler(async (req, res) => {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok' });
  }),
);

// Auth routes
app.post(
  '/api/auth/register',
  asyncHandler(async (req, res) => {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'name, email and password are required' });
    }
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ message: 'Email already in use' });
    }
    const hash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, password: hash, role: role || 'user' },
      select: { id: true, name: true, email: true, role: true },
    });
    const token = jwt.sign({ sub: user.id, email: user.email, role: user.role }, JWT_SECRET, {
      expiresIn: '8h',
    });
    res.status(201).json({ user, token });
  }),
);

app.post(
  '/api/auth/login',
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'email and password are required' });
    }
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const safeUser = { id: user.id, name: user.name, email: user.email, role: user.role };
    const token = jwt.sign({ sub: user.id, email: user.email, role: user.role }, JWT_SECRET, {
      expiresIn: '8h',
    });
    res.json({ user: safeUser, token });
  }),
);

// Users CRUD (basic)
app.get(
  '/api/users',
  asyncHandler(async (req, res) => {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(users);
  }),
);

// Projects CRUD
app.get(
  '/api/projects',
  asyncHandler(async (req, res) => {
    const projects = await prisma.project.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(projects);
  }),
);

app.post(
  '/api/projects',
  asyncHandler(async (req, res) => {
    const { name, key } = req.body;
    if (!name || !key) {
      return res.status(400).json({ message: 'name and key are required' });
    }
    const project = await prisma.project.create({ data: { name, key } });
    res.status(201).json(project);
  }),
);

app.patch(
  '/api/projects/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const { name } = req.body;
    try {
      const project = await prisma.project.update({
        where: { id },
        data: { name },
      });
      res.json(project);
    } catch {
      res.status(404).json({ message: 'Project not found' });
    }
  }),
);

app.delete(
  '/api/projects/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    try {
      const project = await prisma.project.delete({ where: { id } });
      res.json(project);
    } catch {
      res.status(404).json({ message: 'Project not found' });
    }
  }),
);

// Tickets CRUD
app.get(
  '/api/tickets',
  asyncHandler(async (req, res) => {
    const { search, status, priority, assigneeId, projectId } = req.query;

    const where = {};

    if (search) {
      const term = String(search);
      // SQLite does not support case-insensitive "mode" option here,
      // so we use a simple contains filter.
      where.OR = [
        { title: { contains: term } },
        { description: { contains: term } },
      ];
    }
    if (status) where.status = String(status);
    if (priority) where.priority = String(priority);
    if (assigneeId) {
      const value = String(assigneeId);
      if (value === 'unassigned') {
        where.assigneeId = null;
      } else {
        where.assigneeId = Number(value);
      }
    }
    if (projectId) where.projectId = Number(projectId);

    const tickets = await prisma.ticket.findMany({
      where,
      include: { assignee: true, project: true },
      orderBy: { updatedAt: 'desc' },
    });

    res.json(
      tickets.map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        projectId: t.projectId,
        assigneeId: t.assigneeId,
        priority: t.priority,
        status: t.status,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      })),
    );
  }),
);

app.get(
  '/api/tickets/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: { assignee: true, project: true },
    });
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }
    res.json(ticket);
  }),
);

app.post(
  '/api/tickets',
  asyncHandler(async (req, res) => {
    const { title, description, priority, assigneeId, projectId } = req.body;

    if (!title || !description || !projectId) {
      return res.status(400).json({ message: 'title, description and projectId are required' });
    }

    if (priority && !PRIORITIES.includes(priority)) {
      return res.status(400).json({ message: `priority must be one of ${PRIORITIES.join(', ')}` });
    }

    const project = await prisma.project.findUnique({ where: { id: Number(projectId) } });
    if (!project) {
      return res.status(400).json({ message: 'projectId is invalid' });
    }

    let assignee = null;
    let assigneeIdNumber = null;
    if (assigneeId !== undefined && assigneeId !== null && assigneeId !== '') {
      assigneeIdNumber = Number(assigneeId);
      assignee = await prisma.user.findUnique({ where: { id: assigneeIdNumber } });
      if (!assignee) {
        return res.status(400).json({ message: 'assigneeId is invalid' });
      }
    }

    const ticket = await prisma.ticket.create({
      data: {
        title,
        description,
        projectId: project.id,
        assigneeId: assigneeIdNumber,
        priority: priority || 'Medium',
        status: 'Open',
      },
    });

    res.status(201).json(ticket);
  }),
);

app.patch(
  '/api/tickets/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const { title, description, priority, status, assigneeId, projectId } = req.body;

    if (priority && !PRIORITIES.includes(priority)) {
      return res.status(400).json({ message: `priority must be one of ${PRIORITIES.join(', ')}` });
    }

    if (status && !STATUSES.includes(status)) {
      return res.status(400).json({ message: `status must be one of ${STATUSES.join(', ')}` });
    }

    let assigneeIdNumber = undefined;
    if (assigneeId !== undefined) {
      if (assigneeId === null || assigneeId === '') {
        assigneeIdNumber = null;
      } else {
        assigneeIdNumber = Number(assigneeId);
        const assignee = await prisma.user.findUnique({ where: { id: assigneeIdNumber } });
        if (!assignee) {
          return res.status(400).json({ message: 'assigneeId is invalid' });
        }
      }
    }

    let projectIdNumber = undefined;
    if (projectId !== undefined) {
      projectIdNumber = Number(projectId);
      const project = await prisma.project.findUnique({ where: { id: projectIdNumber } });
      if (!project) {
        return res.status(400).json({ message: 'projectId is invalid' });
      }
    }

    try {
      const ticket = await prisma.ticket.update({
        where: { id },
        data: {
          title,
          description,
          priority,
          status,
          assigneeId: assigneeIdNumber,
          ...(projectIdNumber !== undefined ? { projectId: projectIdNumber } : {}),
        },
      });
      res.json(ticket);
    } catch {
      res.status(404).json({ message: 'Ticket not found' });
    }
  }),
);

app.delete(
  '/api/tickets/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    try {
      const ticket = await prisma.ticket.delete({ where: { id } });
      res.json(ticket);
    } catch {
      res.status(404).json({ message: 'Ticket not found' });
    }
  }),
);

// Global error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: 'Internal server error' });
});

async function start() {
  await prisma.$connect();
  await seedDefaultsIfEmpty();

  app.listen(PORT, () => {
    console.log(`Backend API listening on http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server', err);
  process.exit(1);
});

