#!/usr/bin/env python3
"""Scoped inbox access for Codex. Credentials come only from secure environment settings."""
import argparse, json, os, pathlib, re, subprocess, sys, urllib.request, urllib.error
ROOT=pathlib.Path(__file__).resolve().parents[1]
class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self,*args,**kwargs):
        raise RuntimeError('Inbox endpoint redirected; no credentials were forwarded.')
def settings():
    config=json.loads((ROOT/'public/account-config.json').read_text())
    url=config['supabaseUrl'].rstrip('/')
    if not re.fullmatch(r'https://[a-z0-9]+\.supabase\.co',url):
        raise RuntimeError('Use the configured HTTPS Supabase project endpoint.')
    token=os.environ.get('CHUDS_WORKER_TOKEN','')
    if not token:raise RuntimeError('CHUDS_WORKER_TOKEN is missing. Add the limited inbox key in secure cloud environment settings; do not paste it into chat.')
    return url+'/functions/v1/assistant-inbox',config['supabasePublishableKey'],token

def request(action,**fields):
    endpoint,public_key,token=settings()
    req=urllib.request.Request(endpoint,json.dumps({'action':action,**fields}).encode(),headers={'apikey':public_key,'x-chuds-worker-token':token,'content-type':'application/json'},method='POST')
    try:
        with urllib.request.build_opener(NoRedirect()).open(req,timeout=180) as response:
            data=response.read(21*1024*1024+1)
            if len(data)>21*1024*1024:raise RuntimeError('Inbox response exceeds the slide-size limit.')
            return data if action=='download' else json.loads(data)
    except urllib.error.HTTPError as error:
        if error.code==404:raise RuntimeError('Deploy the assistant-inbox Supabase function first.') from None
        if error.code==401:raise RuntimeError('Inbox key was rejected. Check expiry, revocation and the secure binding. The function must use its scoped key instead of JWT verification.') from None
        raise RuntimeError('Inbox request failed (HTTP '+str(error.code)+'). Check the app setup and submitted deck; credentials were not logged.') from None

def normalize_deck(path):
    completed=subprocess.run(['node',str(ROOT/'scripts/prepare-worker-deck.mjs')],input=pathlib.Path(path).read_text(),capture_output=True,text=True,cwd=ROOT)
    if completed.returncode:raise RuntimeError('Deck validation failed: '+completed.stderr.strip())
    return json.loads(completed.stdout)

def main(argv=None):
    parser=argparse.ArgumentParser(description=__doc__);commands=parser.add_subparsers(dest='command',required=True)
    commands.add_parser('check')
    inbox=commands.add_parser('inbox');inbox.add_argument('--all',action='store_true')
    download=commands.add_parser('download');download.add_argument('submission');download.add_argument('--out',required=True)
    deliver=commands.add_parser('deliver');deliver.add_argument('submission');deliver.add_argument('deck');deliver.add_argument('--confirm',action='store_true')
    args=parser.parse_args(argv)
    if args.command=='check':print(json.dumps(request('check'),indent=2));return
    if args.command=='inbox':print(json.dumps(request('inbox',include_completed=args.all),indent=2));return
    if not re.fullmatch(r'[0-9a-f-]{36}',args.submission):raise RuntimeError('Use an inbox submission UUID.')
    row=request('submission',submission_id=args.submission)
    if row.get('id')!=args.submission:raise RuntimeError('Inbox returned the wrong submission.')
    if args.command=='download':
        folder=pathlib.Path(args.out).resolve()
        if folder==ROOT or ROOT in folder.parents:raise RuntimeError('Save private lecture files outside the public Git checkout, for example /workspace/attachments/inbox.')
        suffix=pathlib.Path(row['file_name']).suffix.lower()
        if suffix not in ('.pdf','.pptx'):raise RuntimeError('Unsupported submitted slide file.')
        if not 0<int(row['file_size'])<=20*1024*1024:raise RuntimeError('Invalid slide-size metadata.')
        data=request('download',submission_id=args.submission)
        if len(data)!=int(row['file_size']):raise RuntimeError('Download is incomplete; file size does not match the submission.')
        if suffix=='.pdf' and b'%PDF-' not in data[:1024]:raise RuntimeError('Downloaded file is not a PDF.')
        if suffix=='.pptx' and not data.startswith(b'PK\x03\x04'):raise RuntimeError('Downloaded file is not a PPTX.')
        folder.mkdir(parents=True,exist_ok=True);target=folder/(args.submission+suffix)
        if target.exists():raise RuntimeError('Download already exists; choose another output directory to preserve it.')
        with target.open('xb') as output:output.write(data)
        os.chmod(target,0o600)
        metadata=folder/(args.submission+'.submission.json');metadata.write_text(json.dumps(row,indent=2));os.chmod(metadata,0o600)
        print(json.dumps({'file':str(target),'metadata':str(metadata),'original_filename':row['file_name'],'module':row.get('module_name'),'sender':row.get('sender_email')},indent=2));return
    deck=normalize_deck(args.deck)
    if deck.get('source')!=row['file_name']:raise RuntimeError('Deck source must exactly match the original filename in the submission metadata.')
    preview={'submission':args.submission,'recipient':row['sender_email'],'module':row.get('module_name') or deck.get('moduleName'),'lecture':row.get('title') or deck['title'],'cards':len(deck['cards'])}
    if not args.confirm:print(json.dumps({'preview':preview,'delivered':False,'next':'Review the deck. Use --confirm only when the user asked to send it.'},indent=2));return
    print(json.dumps(request('deliver',submission_id=args.submission,deck=deck),indent=2))
if __name__=='__main__':
    try:main()
    except Exception as error:
        message=str(error);token=os.environ.get('CHUDS_WORKER_TOKEN','')
        if token:message=message.replace(token,'[redacted]')
        print(message,file=sys.stderr);sys.exit(1)
