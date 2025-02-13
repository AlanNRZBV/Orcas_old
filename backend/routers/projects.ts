import { Router } from 'express';
import auth, { RequestWithUser } from '../middleware/auth';
import Project from '../models/Project';
import { ProjectData } from '../types';
import mongoose from 'mongoose';
import Studio from '../models/Studio';
import Team from '../models/Team';

const projectsRouter = Router();

projectsRouter.get('/', auth, async (req: RequestWithUser, res, next) => {
  try {
    const user = req.user?._id;

    if ('studio' in req.query) {
      const id = req.query.studio as string;

      const isStudioExists = await Studio.findById(id);

      if (!isStudioExists) {
        return res.status(404).send({ error: 'Студия не найдена', studio: {} });
      }

      if (isStudioExists.owner.toString() !== user?.toString()) {
        return res.status(422).send({ error: 'Нет доступа', studio: {} });
      }

      const projects = await Project.find({ studioId: id }).populate({
        path: 'team',
        populate: {
          path: 'teamId',
          select: '-_id',
          populate: {
            path: 'members',
            select: '-_id',
            populate: {
              path: 'userId',
              select: '-_id firstName lastName spec',
            },
          },
        },
      });
      const isEmpty = projects.length < 1;
      if (isEmpty) {
        return res.status(404).send({ message: 'Нет проектов', projects: [] });
      }
      return res.send({ message: 'Данные успешно загружены', projects });
    }
  } catch (e) {
    next(e);
  }
});

projectsRouter.post('/add', auth, async (req: RequestWithUser, res, next) => {
  try {
    const userId = req.user?._id;
    const id = req.body.studioId;
    const isStudioExists = await Studio.findById(id);
    // const isManager = await Studio.findOne({
    //   'staff.userId': userId,
    //   'staff.spec.name': 'менеджер',
    // }); //ToDo add roles
    if (!isStudioExists) {
      return res.status(404).send({ error: 'Студия не найдена', studio: {} });
    }

    if (isStudioExists.owner.toString() !== userId?.toString()) {
      return res.status(422).send({ error: 'Нет доступа', studio: {} });
    }

    const projectData: ProjectData = {
      studioId: req.body.studioId,
      name: req.body.name,
      team: req.body.team ? req.body.team : [],
      expireAt: req.body.expireAt,
    };

    const project = new Project(projectData);
    const savedProject = await project.save();

    isStudioExists.projects.push({ projectId: savedProject._id });
    await isStudioExists.save();

    return res.send({ message: 'Проект успешно создан', project });
  } catch (e) {
    if (e instanceof mongoose.Error.ValidationError || e instanceof mongoose.Error.CastError) {
      return res.status(422).send({ message: 'Ошибка проверки данных', errorMsg: e });
    }
    next(e);
  }
});

projectsRouter.patch('/update/:id', auth, async (req, res, next) => {
  try {
    const id = req.params.id;
    const isExist = await Project.findOne({ _id: id });

    if (!isExist) {
      return res.status(404).send({ message: 'Проекта не существует', project: {} });
    }

    const projectData: ProjectData = {
      studioId: req.body.studioId,
      name: req.body.name,
      team: req.body.team,
      expireAt: req.body.expireAt,
    };

    const updatedProject = await Project.findOneAndUpdate({ _id: id }, projectData, { new: true });

    return res.send({ message: 'Данные обновлены', project: updatedProject });
  } catch (e) {
    if (e instanceof mongoose.Error.ValidationError || e instanceof mongoose.Error.CastError) {
      return res.status(422).send({ message: 'Ошибка проверки данных', errorMsg: e });
    }
    next(e);
  }
});

projectsRouter.patch('/assign', auth, async (req, res, next) => {
  try {
    const teamId = req.query.team;
    const projectId = req.query.project;
    const team = await Team.findById(teamId);
    const project = await Project.findById(projectId);

    if (!team || !project) {
      return res.status(404).send({ error: 'Данные не были найдены', project: {} });
    }

    project.team.push({ teamId: team._id });
    await project.save();
    return res.send({ message: `Команда успешно добавлена в проект ${project.name}`, project: project });
  } catch (e) {
    if (e instanceof mongoose.Error.ValidationError || e instanceof mongoose.Error.CastError) {
      return res.status(422).send({ message: 'Ошибка проверки данных', errorMsg: e });
    }
    next(e);
  }
});

projectsRouter.delete('/delete/:id', auth, async (req: RequestWithUser, res, next) => {
  try {
    const user = req.user?._id;
    const id = req.params.id;
    const isExist = await Project.findOne({ _id: id });

    if (!isExist) {
      return res.status(404).send({ message: 'Проекта не существует', project: {} });
    }

    const studioId = isExist.studioId;
    const studio = await Studio.findById(studioId); //ToDo refactor this

    if (studio?.owner.toString() !== user?.toString()) {
      return res.status(422).send({ error: 'Нет доступа', studio: {} });
    }

    const deletedProject = await Project.findOneAndDelete({ _id: id });

    return res.send({ message: 'Проект удален', project: deletedProject });
  } catch (e) {
    next(e);
  }
});

export default projectsRouter;
