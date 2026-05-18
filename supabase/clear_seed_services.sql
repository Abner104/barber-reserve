-- Elimina los servicios y categorías del seed para que puedas crear los tuyos
delete from services          where shop_id = 'a0000000-0000-0000-0000-000000000001';
delete from service_categories where shop_id = 'a0000000-0000-0000-0000-000000000001';
