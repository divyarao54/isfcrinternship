from flask import Flask, request, jsonify
from celery_app import celery_app
from tasks import scrape_papers_task, cleanup_old_jobs_task, health_check_task
from scheduler_python import scheduler
import os
from dotenv import load_dotenv
import subprocess
from flask_cors import CORS
import urllib.parse
import re

load_dotenv()

app = Flask(__name__)
CORS(app)

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    try:
        result = scheduler.check_system_health()
        return jsonify(result), 200
    except Exception as error:
        return jsonify({'error': str(error)}), 500

@app.route('/scrape/trigger', methods=['POST'])
def trigger_scraping():
    """Trigger manual scraping"""
    try:
        data = request.get_json() or {}
        source = data.get('source', 'manual')
        
        result = scheduler.trigger_manual_scraping(source)
        return jsonify(result), 200 if result['success'] else 400
    except Exception as error:
        return jsonify({'error': str(error)}), 500

@app.route('/tasks/status', methods=['GET'])
def get_tasks_status():
    """Get status of all active tasks"""
    try:
        task_id = request.args.get('task_id')
        if task_id:
            result = scheduler.get_task_status(task_id)
        else:
            result = scheduler.get_active_tasks()
        return jsonify(result), 200
    except Exception as error:
        return jsonify({'error': str(error)}), 500

@app.route('/tasks/terminate', methods=['POST'])
def terminate_task():
    """Terminate a specific task"""
    try:
        data = request.get_json()
        task_id = data.get('task_id')
        
        if not task_id:
            return jsonify({'error': 'task_id is required'}), 400
        
        result = scheduler.terminate_task(task_id)
        return jsonify(result), 200 if result['success'] else 400
    except Exception as error:
        return jsonify({'error': str(error)}), 500

@app.route('/tasks/cleanup', methods=['POST'])
def cleanup_tasks():
    """Cleanup stuck tasks"""
    try:
        result = scheduler.cleanup_stuck_tasks()
        return jsonify(result), 200 if result['success'] else 400
    except Exception as error:
        return jsonify({'error': str(error)}), 500

@app.route('/papers/count', methods=['GET'])
def get_papers_count():
    """Get count of papers in database"""
    try:
        from db_config import get_collection
        papers_collection = get_collection('papers')
        count = papers_collection.count_documents({})
        return jsonify({'count': count}), 200
    except Exception as error:
        return jsonify({'error': str(error)}), 500

@app.route('/papers', methods=['GET'])
def get_papers():
    """Get papers from database"""
    try:
        from db_config import get_collection
        papers_collection = get_collection('papers')
        
        # Get query parameters
        limit = int(request.args.get('limit', 50))
        skip = int(request.args.get('skip', 0))
        
        # Get papers
        papers = list(papers_collection.find({}, {'_id': 0}).skip(skip).limit(limit))
        
        return jsonify({
            'papers': papers,
            'total': len(papers),
            'limit': limit,
            'skip': skip
        }), 200
    except Exception as error:
        return jsonify({'error': str(error)}), 500

@app.route('/teachers', methods=['GET'])
def get_teachers():
    """Get all teachers from database"""
    try:
        from db_config import get_collection
        teachers_collection = get_collection('teachers')
        
        # Get all teachers
        teachers = list(teachers_collection.find({}, {'_id': 0}))
        
        return jsonify({
            'teachers': teachers,
            'total': len(teachers)
        }), 200
    except Exception as error:
        return jsonify({'error': str(error)}), 500

@app.route('/teachers/debug', methods=['GET'])
def debug_teachers():
    """Debug endpoint to see all teachers in database"""
    try:
        from db_config import get_collection
        teachers_collection = get_collection('teachers')
        
        # Get all teachers with their names
        teachers = list(teachers_collection.find({}, {'name': 1, 'profileUrl': 1, '_id': 0}))
        
        return jsonify({
            'teachers': teachers,
            'total': len(teachers)
        }), 200
    except Exception as error:
        return jsonify({'error': str(error)}), 500

@app.route('/teachers/<teacher_id>', methods=['GET'])
def get_teacher(teacher_id):
    """Get individual teacher by name"""
    try:
        print(f"=== GET /teachers/{teacher_id} ===")
        from db_config import get_collection
        teachers_collection = get_collection('teachers')
        
        # Decode the URL-encoded teacher_id
        decoded_teacher_id = urllib.parse.unquote(teacher_id)
        print(f"Looking for teacher with name: '{decoded_teacher_id}'")
        
        # Find teacher by name
        teacher = teachers_collection.find_one({'name': decoded_teacher_id}, {'_id': 0})
        
        if not teacher:
            # Debug: list all teachers to see what names are available
            all_teachers = list(teachers_collection.find({}, {'name': 1, '_id': 0}))
            print(f"Available teachers: {[t['name'] for t in all_teachers]}")
            print(f"404: Teacher '{decoded_teacher_id}' not found")
            return jsonify({'error': 'Teacher not found'}), 404
        
        print(f"Found teacher: {teacher['name']}")
        print(f"Returning teacher data: {teacher}")
        return jsonify({'teacher': teacher}), 200
    except Exception as error:
        print(f"Error in get_teacher: {error}")
        return jsonify({'error': str(error)}), 500

@app.route('/teachers/<teacher_id>/citations', methods=['GET'])
def get_teacher_citations(teacher_id):
    """Get citation statistics from Google Scholar profile"""
    try:
        from db_config import get_collection
        teachers_collection = get_collection('teachers')
        
        # Decode the URL-encoded teacher_id
        decoded_teacher_id = urllib.parse.unquote(teacher_id)
        
        # Find teacher by name first
        teacher = teachers_collection.find_one({'name': decoded_teacher_id})
        if not teacher:
            return jsonify({'error': 'Teacher not found'}), 404
        
        # Use the teacher's profileUrl for scraping
        profile_url = teacher['profileUrl']
        
        # Import the scraper function
        import subprocess
        import json
        
        # Call a Node.js script to scrape citation data
        result = subprocess.run(
            ['node', 'citation_scraper.js', profile_url],
            cwd=os.path.join(os.path.dirname(__file__)),
            capture_output=True, text=True, timeout=60
        )
        
        if result.returncode != 0:
            return jsonify({'error': 'Failed to fetch citation data'}), 500
        
        try:
            citations = json.loads(result.stdout)
            return jsonify({'citations': citations}), 200
        except json.JSONDecodeError:
            return jsonify({'error': 'Invalid citation data format'}), 500
            
    except Exception as error:
        return jsonify({'error': str(error)}), 500

@app.route('/admin/scrape', methods=['POST'])
def admin_scrape():
    data = request.get_json()
    profile_url = data.get('profileUrl')
    if not profile_url:
        return jsonify({'error': 'No profileUrl provided'}), 400

    # Call scraper.js with the profileUrl as an argument
    try:
        print(f"Starting scraping for profile: {profile_url}")
        
        import subprocess
        import tempfile
        import os
        
        # Create temporary files for output to avoid encoding issues
        with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False, encoding='utf-8') as stdout_file, \
             tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False, encoding='utf-8') as stderr_file:
            
            stdout_path = stdout_file.name
            stderr_path = stderr_file.name
        
        try:
            # Start the scraper process with output redirected to files
            scraper_process = subprocess.Popen(
                ['node', 'scraper.js', profile_url],
                cwd=os.path.join(os.path.dirname(__file__)),
                stdout=open(stdout_path, 'w', encoding='utf-8'),
                stderr=open(stderr_path, 'w', encoding='utf-8'),
                env=dict(os.environ, PYTHONIOENCODING='utf-8', NODE_OPTIONS='--max-old-space-size=4096')
            )
            
            try:
                return_code = scraper_process.wait(timeout=600)
            except subprocess.TimeoutExpired:
                scraper_process.kill()
                return jsonify({'error': 'Scraping timed out after 10 minutes'}), 500
            
            # Read the output files
            with open(stdout_path, 'r', encoding='utf-8', errors='replace') as f:
                stdout = f.read()
            with open(stderr_path, 'r', encoding='utf-8', errors='replace') as f:
                stderr = f.read()
            
            if return_code != 0:
                print(f"Scraper failed with return code {return_code}")
                print(f"STDERR: {stderr}")
                return jsonify({'error': stderr}), 500
            
            print("Scraping completed successfully, starting Elasticsearch sync...")
            print(f"Scraper output: {stdout[:500]}...")  # Show first 500 chars
            
            # Automatically sync to Elasticsearch after successful scraping
            try:
                print("Running syncToElastic.js...")
                
                # Create temporary files for sync output
                with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False, encoding='utf-8') as sync_stdout_file, \
                     tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False, encoding='utf-8') as sync_stderr_file:
                    
                    sync_stdout_path = sync_stdout_file.name
                    sync_stderr_path = sync_stderr_file.name
                
                try:
                    sync_process = subprocess.Popen(
                        ['node', 'syncToElastic.js'],
                        cwd=os.path.join(os.path.dirname(os.path.dirname(__file__))),
                        stdout=open(sync_stdout_path, 'w', encoding='utf-8'),
                        stderr=open(sync_stderr_path, 'w', encoding='utf-8'),
                        env=dict(os.environ, PYTHONIOENCODING='utf-8', NODE_OPTIONS='--max-old-space-size=4096')
                    )
                    
                    try:
                        sync_return_code = sync_process.wait(timeout=300)
                    except subprocess.TimeoutExpired:
                        sync_process.kill()
                        print("⚠️ Elasticsearch sync timed out")
                        return jsonify({
                            'message': 'Scraping completed but Elasticsearch sync timed out', 
                            'output': stdout
                        }), 200
                    
                    # Read the sync output files
                    with open(sync_stdout_path, 'r', encoding='utf-8', errors='replace') as f:
                        sync_stdout = f.read()
                    with open(sync_stderr_path, 'r', encoding='utf-8', errors='replace') as f:
                        sync_stderr = f.read()
                    
                finally:
                    # Clean up sync temp files
                    try:
                        os.unlink(sync_stdout_path)
                        os.unlink(sync_stderr_path)
                    except:
                        pass
                
                print(f"Sync completed with return code: {sync_return_code}")
                print(f"Sync output: {sync_stdout[:500]}...")  # Show first 500 chars
                
                if sync_return_code == 0:
                    print("✅ Elasticsearch sync completed successfully")
                    return jsonify({
                        'message': 'Scraping and Elasticsearch sync completed successfully', 
                        'output': stdout,
                        'sync_output': sync_stdout
                    }), 200
                else:
                    print(f"⚠️ Elasticsearch sync failed: {sync_stderr}")
                    return jsonify({
                        'message': 'Scraping completed but Elasticsearch sync failed', 
                        'output': stdout,
                        'sync_error': sync_stderr
                    }), 200  # Still return 200 since scraping was successful
                    
            except Exception as sync_error:
                print(f"⚠️ Error during Elasticsearch sync: {sync_error}")
                return jsonify({
                    'message': 'Scraping completed but Elasticsearch sync failed', 
                    'output': stdout,
                    'sync_error': str(sync_error)
                }), 200
                
        finally:
            # Clean up temp files
            try:
                os.unlink(stdout_path)
                os.unlink(stderr_path)
            except:
                pass
            
    except Exception as e:
        print(f"Error during scraping: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/teachers/<teacher_id>/publications', methods=['GET'])
def get_teacher_publications(teacher_id):
    """Get all publications for a teacher, sorted by number of citations (descending)"""
    try:
        from db_config import get_collection
        teachers_collection = get_collection('teachers')
        import urllib.parse
        decoded_teacher_id = urllib.parse.unquote(teacher_id)
        teacher = teachers_collection.find_one({'name': decoded_teacher_id})
        if not teacher:
            return jsonify({'error': 'Teacher not found'}), 404
        teacher_name = teacher['name']
        
        # Get the teacher's specific papers collection
        collection_name = 'papers_' + re.sub(r'[^a-z0-9]', '_', teacher_name.lower())
        teacher_papers_collection = get_collection(collection_name)
        
        # Find all papers for this teacher, sorted by citationCount descending
        papers = list(teacher_papers_collection.find({}, {'_id': 0}).sort('citationCount', -1))
        return jsonify({'publications': papers, 'total': len(papers)}), 200
    except Exception as error:
        return jsonify({'error': str(error)}), 500

@app.route('/teachers/<teacher_id>/publications/<publication_id>', methods=['GET'])
def get_publication_details(teacher_id, publication_id):
    """Get specific publication details by publication title"""
    try:
        print(f"=== GET /teachers/{teacher_id}/publications/{publication_id} ===")
        from db_config import get_collection
        teachers_collection = get_collection('teachers')
        
        # Decode the teacher_id
        decoded_teacher_id = urllib.parse.unquote(teacher_id)
        print(f"Looking for teacher: '{decoded_teacher_id}'")
        teacher = teachers_collection.find_one({'name': decoded_teacher_id})
        if not teacher:
            print(f"Teacher '{decoded_teacher_id}' not found")
            return jsonify({'error': 'Teacher not found'}), 404
        
        # Decode the publication_id (which is the URL-encoded publication title)
        decoded_publication_title = urllib.parse.unquote(publication_id)
        print(f"Looking for publication: '{decoded_publication_title}'")
        
        # Get the teacher's specific papers collection
        teacher_name = teacher['name']
        # Sanitize collection name (same logic as in scraper.js)
        collection_name = 'papers_' + re.sub(r'[^a-z0-9]', '_', teacher_name.lower())
        print(f"Using collection: '{collection_name}'")
        
        # Get the specific collection for this teacher
        teacher_papers_collection = get_collection(collection_name)
        
        # Find the specific publication by title
        publication = teacher_papers_collection.find_one(
            {'title': decoded_publication_title}, 
            {'_id': 0}
        )
        
        if not publication:
            # Debug: list all publications in this collection
            all_publications = list(teacher_papers_collection.find({}, {'title': 1, '_id': 0}))
            print(f"Available publications in {collection_name}: {[p['title'] for p in all_publications]}")
            print(f"404: Publication '{decoded_publication_title}' not found")
            return jsonify({'error': 'Publication not found'}), 404
        
        print(f"Found publication: {publication['title']}")
        return jsonify({'publication': publication}), 200
    except Exception as error:
        print(f"Error in get_publication_details: {error}")
        return jsonify({'error': str(error)}), 500

@app.route('/elasticsearch/status', methods=['GET'])
def check_elasticsearch_status():
    """Check Elasticsearch sync status and list available indices"""
    try:
        import subprocess
        import json
        import tempfile
        import os
        
        # Get the absolute path to client.js
        root_dir = os.path.dirname(os.path.dirname(__file__))
        client_path = os.path.join(root_dir, 'client.js')
        
        # Create a simple Node.js script to check Elasticsearch
        check_script = f'''
const client = require('{client_path.replace("\\", "/")}');
client.cat.indices({{format: 'json'}})
  .then(res => {{
    console.log(JSON.stringify(res.body));
  }})
  .catch(err => {{
    console.error('Error:', err.message);
    process.exit(1);
  }});
'''
        
        # Write the script to a temporary file
        with tempfile.NamedTemporaryFile(mode='w', suffix='.js', delete=False, encoding='utf-8') as f:
            f.write(check_script)
            temp_script = f.name
        
        # Create temporary files for output
        with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False, encoding='utf-8') as stdout_file, \
             tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False, encoding='utf-8') as stderr_file:
            
            stdout_path = stdout_file.name
            stderr_path = stderr_file.name
        
        try:
            # Run the script with output redirected to files
            process = subprocess.Popen(
                ['node', temp_script],
                cwd=root_dir,  # Run from root directory where client.js is located
                stdout=open(stdout_path, 'w', encoding='utf-8'),
                stderr=open(stderr_path, 'w', encoding='utf-8'),
                env=dict(os.environ, PYTHONIOENCODING='utf-8', NODE_OPTIONS='--max-old-space-size=4096')
            )
            
            try:
                return_code = process.wait(timeout=30)
            except subprocess.TimeoutExpired:
                process.kill()
                return jsonify({
                    'status': 'error',
                    'message': 'Elasticsearch status check timed out'
                }), 500
            
            # Read the output files
            with open(stdout_path, 'r', encoding='utf-8', errors='replace') as f:
                stdout = f.read()
            with open(stderr_path, 'r', encoding='utf-8', errors='replace') as f:
                stderr = f.read()
            
        finally:
            # Clean up temp files
            try:
                os.unlink(temp_script)
                os.unlink(stdout_path)
                os.unlink(stderr_path)
            except:
                pass
        
        if return_code == 0 and stdout.strip():
            try:
                indices = json.loads(stdout)
                paper_indices = [idx for idx in indices if idx.get('index', '').startswith('papers_')]
                
                return jsonify({
                    'status': 'connected',
                    'total_indices': len(indices),
                    'paper_indices': len(paper_indices),
                    'paper_indices_list': [idx['index'] for idx in paper_indices],
                    'all_indices': [idx['index'] for idx in indices]
                }), 200
            except json.JSONDecodeError:
                return jsonify({
                    'status': 'connected',
                    'message': 'Could not parse indices data',
                    'raw_output': stdout
                }), 200
        else:
            return jsonify({
                'status': 'error',
                'message': 'Failed to connect to Elasticsearch',
                'error': stderr or 'No output from Elasticsearch'
            }), 500
            
    except Exception as error:
        return jsonify({
            'status': 'error',
            'message': 'Error checking Elasticsearch status',
            'error': str(error)
        }), 500

@app.route('/search', methods=['GET'])
def search_papers():
    """Search papers across all Elasticsearch indices"""
    try:
        import subprocess
        import json
        import tempfile
        import os
        
        # Get search query from request parameters
        query = request.args.get('q', '').strip()
        if not query:
            return jsonify({'error': 'No search query provided'}), 400
        
        # Get the absolute path to searchPaper.js
        root_dir = os.path.dirname(os.path.dirname(__file__))
        search_script_path = os.path.join(root_dir, 'searchPaper.js')
        
        # Create a modified search script that accepts query as argument
        search_script = f'''
const client = require('{os.path.join(root_dir, "client.js").replace("\\", "/")}');

async function getTeacherIndices() {{
  try {{
    const indices = await client.cat.indices({{ format: 'json' }});
    return indices
      .filter(index => index.index.startsWith('papers_'))
      .map(index => index.index);
  }} catch (error) {{
    console.error('Error getting indices:', error.message);
    return [];
  }}
}}

async function searchPapers(keyword) {{
  const teacherIndices = await getTeacherIndices();
  
  if (teacherIndices.length === 0) {{
    console.log('[]');
    return;
  }}

  try {{
    const result = await client.search({{
      index: teacherIndices,
      query: {{
        multi_match: {{
          query: keyword,
          fields: ['title', 'authors', 'description', 'summary'],
          fuzziness: 'AUTO',
        }},
      }},
      size: 50,
    }});

    const keywordLower = keyword.toLowerCase();
    const filtered = result.hits.hits.filter(hit => {{
      const {{ title = '', authors = '', description = '', summary = '' }} = hit._source;
      return (
        title.toLowerCase().includes(keywordLower) ||
        authors.toLowerCase().includes(keywordLower) ||
        description.toLowerCase().includes(keywordLower) ||
        summary.toLowerCase().includes(keywordLower)
      );
    }});

    const results = filtered.map(hit => {{
      const paper = hit._source;
      return {{
        title: paper.title || '',
        authors: paper.authors || '',
        year: paper.year || '',
        url: paper.url || '',
        teacherName: paper.teacherName || '',
        index: hit._index,
        citationCount: paper.citationCount || 0,
        description: paper.description || '',
        summary: paper.summary || '',
        source: paper.source || '',
        journal: paper.journal || '',
        conference: paper.conference || '',
        book: paper.book || '',
        pdfLink: paper.pdfLink || ''
      }};
    }});

    console.log(JSON.stringify(results));
  }} catch (error) {{
    console.error('Search error:', error.message);
    console.log('[]');
  }}
}}

const keyword = process.argv[2] || '';
searchPapers(keyword);
'''
        
        # Write the script to a temporary file
        with tempfile.NamedTemporaryFile(mode='w', suffix='.js', delete=False, encoding='utf-8') as f:
            f.write(search_script)
            temp_script = f.name
        
        # Create temporary files for output
        with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False, encoding='utf-8') as stdout_file, \
             tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False, encoding='utf-8') as stderr_file:
            
            stdout_path = stdout_file.name
            stderr_path = stderr_file.name
        
        try:
            # Run the search script with the query as argument
            process = subprocess.Popen(
                ['node', temp_script, query],
                cwd=root_dir,
                stdout=open(stdout_path, 'w', encoding='utf-8'),
                stderr=open(stderr_path, 'w', encoding='utf-8'),
                env=dict(os.environ, PYTHONIOENCODING='utf-8', NODE_OPTIONS='--max-old-space-size=4096')
            )
            
            try:
                return_code = process.wait(timeout=30)
            except subprocess.TimeoutExpired:
                process.kill()
                return jsonify({
                    'error': 'Search timed out'
                }), 500
            
            # Read the output files
            with open(stdout_path, 'r', encoding='utf-8', errors='replace') as f:
                stdout = f.read()
            with open(stderr_path, 'r', encoding='utf-8', errors='replace') as f:
                stderr = f.read()
            
        finally:
            # Clean up temp files
            try:
                os.unlink(temp_script)
                os.unlink(stdout_path)
                os.unlink(stderr_path)
            except:
                pass
        
        if return_code == 0 and stdout.strip():
            try:
                results = json.loads(stdout)
                return jsonify({
                    'query': query,
                    'total_results': len(results),
                    'results': results
                }), 200
            except json.JSONDecodeError:
                return jsonify({
                    'error': 'Invalid search results format',
                    'raw_output': stdout
                }), 500
        else:
            return jsonify({
                'error': 'Search failed',
                'stderr': stderr
            }), 500
            
    except Exception as error:
        return jsonify({
            'error': 'Error performing search',
            'message': str(error)
        }), 500

if __name__ == '__main__':
    port = int(os.getenv('API_PORT', 5000))
    # Disable debug mode and auto-reloader to prevent conflicts with Celery
    app.run(host='0.0.0.0', port=port, debug=False, use_reloader=False) 