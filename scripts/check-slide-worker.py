import importlib.util, io, json, os, tempfile, unittest, contextlib
from unittest.mock import patch
from pathlib import Path
spec=importlib.util.spec_from_file_location('worker',Path(__file__).with_name('slide-worker.py'));worker=importlib.util.module_from_spec(spec);spec.loader.exec_module(worker)
ID='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
class WorkerTests(unittest.TestCase):
 def test_missing_secret_is_actionable(self):
  with patch.dict(os.environ,{},clear=True):
   with self.assertRaisesRegex(RuntimeError,'secure cloud environment settings'):worker.settings()
 def test_preview_does_not_deliver(self):
  row={'id':ID,'file_name':'lecture.pdf','sender_email':'student@example.test','module_name':'Biology'}
  deck={'title':'Deck','source':'lecture.pdf','cards':[{'question':'Q','answer':'A'}]}
  with patch.object(worker,'request',return_value=row) as request,patch.object(worker,'normalize_deck',return_value=deck),contextlib.redirect_stdout(io.StringIO()) as output:
   worker.main(['deliver',ID,'unused.json']);self.assertEqual(request.call_count,1);self.assertFalse(json.loads(output.getvalue())['delivered'])
 def test_download_stays_outside_public_checkout(self):
  with patch.object(worker,'request',return_value={'id':ID}):
   with self.assertRaisesRegex(RuntimeError,'outside the public Git checkout'):worker.main(['download',ID,'--out',str(worker.ROOT)])
 def test_download_validates_file_and_preserves_existing_copy(self):
  data=b'%PDF-1.7\nTest';row={'id':ID,'file_name':'lecture.pdf','file_size':len(data),'sender_email':'student@example.test'}
  with tempfile.TemporaryDirectory() as folder,patch.object(worker,'request',side_effect=[row,data]),contextlib.redirect_stdout(io.StringIO()):
   worker.main(['download',ID,'--out',folder]);self.assertEqual((Path(folder)/(ID+'.pdf')).read_bytes(),data)
   with patch.object(worker,'request',side_effect=[row,data]):
    with self.assertRaisesRegex(RuntimeError,'already exists'):worker.main(['download',ID,'--out',folder])
 def test_wrong_deck_source_cannot_deliver(self):
  with patch.object(worker,'request',return_value={'id':ID,'file_name':'right.pdf'}),patch.object(worker,'normalize_deck',return_value={'source':'wrong.pdf'}):
   with self.assertRaisesRegex(RuntimeError,'exactly match'):worker.main(['deliver',ID,'deck.json','--confirm'])
if __name__=='__main__':unittest.main()
