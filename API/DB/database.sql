CREATE TABLE IF NOT EXISTS categories
(
  category_id INT GENERATED ALWAYS AS IDENTITY,
  category_name varchar(50) NOT NULL,
  PRIMARY KEY(category_id)
);

CREATE TABLE IF NOT EXISTS locations
(
  location_id INT GENERATED ALWAYS AS IDENTITY,
  category_id INT,
  location_name varchar(50) NOT NULL,
  PRIMARY KEY(location_id),
  CONSTRAINT fk_category
    FOREIGN KEY(category_id)
      REFERENCES categories(category_id)
);

CREATE TABLE IF NOT EXISTS users
(
  user_id INT GENERATED ALWAYS AS IDENTITY,
  first_name varchar(50) NOT NULL,
  last_name varchar(50) NOT NULL,
  needs_perc SMALLINT NOT NULL,
  wants_perc SMALLINT NOT NULL,
  savings_perc SMALLINT NOT NULL,
  current_budget NUMERIC(20,2),
  budget_period 

)
