const express = require('express');
const router = express.Router();
const { VipUnknownContent } = require('../models');
const verifyToken = require('../Middleware/verifyToken');
const isAdmin = require('../Middleware/isAdmin');
const { Op, Sequelize } = require('sequelize');
const { v4: uuidv4 } = require('uuid');

function insertRandomChar(base64Str) {
  const letters = 'abcdefghijklmnopqrstuvwxyz';
  const randomChar = letters.charAt(Math.floor(Math.random() * letters.length));
  return base64Str.slice(0, 2) + randomChar + base64Str.slice(2);
}

function encodePayloadToBase64(payload) {
  const jsonStr = JSON.stringify(payload);
  const base64Str = Buffer.from(jsonStr).toString('base64');
  return insertRandomChar(base64Str);
}

// POST - Create VIP Unknown content
router.post('/', verifyToken, isAdmin, async (req, res) => {
  try {
    let vipUnknownContents = req.body;

    if (Array.isArray(vipUnknownContents)) {
      for (let i = 0; i < vipUnknownContents.length; i++) {
        vipUnknownContents[i].slug = uuidv4();
      }
      const createdContents = await VipUnknownContent.bulkCreate(vipUnknownContents);
      return res.status(201).json(createdContents);
    } else {
      vipUnknownContents.slug = uuidv4();
      const createdContent = await VipUnknownContent.create(vipUnknownContents);
      return res.status(201).json(createdContent);
    }
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao criar conteúdo VIP desconhecido: ' + error.message });
  }
});

// GET with search
router.get('/search', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const { search, category, month, region, sortBy = 'postDate', sortOrder = 'DESC' } = req.query;

    const where = {};
    
    if (search) {
      where.name = { [Op.iLike]: `%${search}%` };
    }
    
    if (category) {
      where.category = category;
    }
    
    if (region) {
      where.region = region;
    }
    
    if (month) {
      where.postDate = {
        [Op.and]: [
          Sequelize.where(
            Sequelize.fn('EXTRACT', Sequelize.literal('MONTH FROM "postDate"')),
            month
          )
        ]
      };
    }

    const results = await VipUnknownContent.findAll({
      where,
      order: [[sortBy, sortOrder]],
      limit,
      offset,
      raw: true
    });

    const total = await VipUnknownContent.count({ where });

    const payload = {
      page,
      perPage: limit,
      total,
      totalPages: Math.ceil(total / limit),
      data: results.map(item => ({ ...item, contentType: 'vip-unknown' }))
    };

    const encodedPayload = encodePayloadToBase64(payload);
    return res.status(200).json({ data: encodedPayload });

  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar conteúdos VIP desconhecidos: ' + error.message });
  }
});

// GET all
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 900;
    const offset = (page - 1) * limit;
    const { region } = req.query;

    const where = {};
    if (region) {
      where.region = region;
    }

    const vipUnknownContents = await VipUnknownContent.findAll({
      where,
      limit,
      offset,
      order: [['postDate', 'DESC']],
    });

    const payload = {
      page,
      perPage: limit,
      data: vipUnknownContents,
    };

    const encodedPayload = encodePayloadToBase64(payload);
    res.status(200).json({ data: encodedPayload });

  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar conteúdos VIP desconhecidos: ' + error.message });
  }
});

// GET by slug
router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const vipUnknownContent = await VipUnknownContent.findOne({ where: { slug } });

    if (!vipUnknownContent) {
      return res.status(404).json({ error: 'Conteúdo VIP desconhecido não encontrado com esse slug' });
    }

    const encodedContent = encodePayloadToBase64(vipUnknownContent);
    res.status(200).json({ data: encodedContent });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar conteúdo VIP desconhecido por slug: ' + error.message });
  }
});

// PUT - Update
router.put('/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const vipUnknownContent = await VipUnknownContent.findByPk(id);
    if (!vipUnknownContent) {
      return res.status(404).json({ error: 'Conteúdo VIP desconhecido não encontrado' });
    }

    await vipUnknownContent.update(updateData);
    res.status(200).json(vipUnknownContent);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar conteúdo VIP desconhecido: ' + error.message });
  }
});

// DELETE
router.delete('/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const vipUnknownContent = await VipUnknownContent.findByPk(id);
    if (!vipUnknownContent) {
      return res.status(404).json({ error: 'Conteúdo VIP desconhecido não encontrado' });
    }

    await vipUnknownContent.destroy();
    res.status(200).json({ message: 'Conteúdo VIP desconhecido deletado com sucesso' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao deletar conteúdo VIP desconhecido: ' + error.message });
  }
});

module.exports = router;