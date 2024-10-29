import express from 'express';
import dotenv from 'dotenv';
import pg from 'pg';

const { Client } = pg;

dotenv.config();

const PORT = process.env.NODE_DOCKER_PORT || 8080;

//connec to DB
const db = new Client({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.NAME
});

await db.connect();

//Create app
const app = express();

//Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//Return limit and offset for pagination
const getPagination = (page, size) => {
  const limit = size ? +size : 3;
  const offset = page ? page * limit : 0;

  return { limit, offset };
};

// @desc    Get all ads filtered by term
// @route   GET /search
app.get('/search', async (req, res) => {
  const { term, page, size } = req.query;
  
  let query = ''

  if(term) { 
    const {limit, offset} = getPagination(page,size);
    
    query = `Select DISTINCT a.id,a.name,amount,price/100 as price FROM ads a
    INNER JOIN ad_to_material am on am.ad_id = a.id
    INNER JOIN materials m on m.id = am.material_id
    WHERE a.name LIKE '%${term}%' OR m.name LIKE '%${term}%'
    LIMIT ${limit} OFFSET ${offset};`;

  } else {
    query = `Select id,name,amount,price/100 as price from ads`;
  }

  try{
    const result = await db.query(query);
    res.status(200).json(result.rows);
  } catch {
    res.status(404).json({ message: 'Not found'})
  }

});

// @desc    Get ad by id 
// @route   GET /detail
app.get('/detail', async (req, res) => {
  const { id } = req.query;

  if(id){
    let query = `Select id,name,amount,price/100 as price FROM ads 
    WHERE id='${id}';`

    const ad = await db.query(query);
    const relateAds = await db.query(`select * from ads a
      join ad_to_material am on a.id = am.ad_id
      where am.material_id in
        (select m.id from materials m
          join ad_to_material am on m.id = am.material_id
          where am.ad_id = '${ad.rows[0].id}');`);

    const result = {
      ...ad.rows[0],
      "relatedAds": relateAds.rows
    }
    res.status(200).json(result);
  } else {
    res.status(400).json({ message: 'Bad Request'})
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));