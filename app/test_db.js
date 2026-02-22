const { createClient } = require('@supabase/supabase-js');
const url = "https://cdkpnauyetruhuxdrazh.supabase.co";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNka3BuYXV5ZXRydWh1eGRyYXpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0NDg4MTUsImV4cCI6MjA4NzAyNDgxNX0._B8YtrUtQs9p1HdR1z26U56doi2RxExzaQhMgg2VkYY";
const sb = createClient(url, key);

async function test() {
    console.log("Inserting test row...");
    const { data, error } = await sb.from('reports').insert({ id: 'test_123', url: 'https://test.com', status: 'testing' }).select();
    console.log("Insert result:", data, error);
    
    console.log("Fetching test row...");
    const { data: fetch, error: e2 } = await sb.from('reports').select('*').eq('id', 'test_123');
    console.log("Fetch result:", fetch, e2);
}
test();
