# Quick Test Guide - Phase 4-5 Chat File Upload

## Prerequisites ✅

**Servers Running:**
- ✅ FastAPI Backend: `http://localhost:8000` (Port 8000)
- ✅ MCP WebSocket Server: `http://localhost:8001` (Port 8001)

**Required Environment Variables:**
```bash
export ANTHROPIC_API_KEY="sk-ant-..."  # Required for Claude
export OPENAI_API_KEY="sk-..."         # Optional (for Vision AI)
```

---

## Test 1: Basic UI Elements (No API Calls)

**Goal:** Verify file upload UI works without backend

### Steps:
1. Open browser: `http://localhost:8000`
2. Click chat button (bottom right, animated)
3. Chat drawer slides in from right

### Expected Results:
- ✅ Chat panel visible
- ✅ Input box at bottom
- ✅ Hover over input → Paperclip button appears (📎)
- ✅ No paperclip when not hovering (opacity: 0)

**Status:** ___________

---

## Test 2: File Selection via Click

**Goal:** Test paperclip button file picker

### Steps:
1. Hover over chat input
2. Click paperclip button (📎)
3. Select a PDF file from your computer (<5MB)

### Expected Results:
- ✅ File picker dialog opens
- ✅ After selection: Badge appears above input
- ✅ Badge shows: `[📄] filename.pdf [×]`
- ✅ Console log: `"📎 File attached: filename.pdf (XX.XKB)"`

**Status:** ___________

---

## Test 3: Drag-and-Drop

**Goal:** Test drag-drop file upload

### Steps:
1. Find a PDF file on your computer
2. Drag it over the chat input area
3. Drop it

### Expected Results:
- ✅ Drag-over: Blue dashed border appears
- ✅ Drag-over: Background tints light blue
- ✅ Drop: Badge appears with filename
- ✅ Badge icon: 📄 for PDF, 🖼️ for image
- ✅ Console log shows file size

**Status:** ___________

---

## Test 4: File Validation

**Goal:** Test file type and size limits

### Test 4a: Invalid File Type
1. Try to upload a `.txt` or `.docx` file

**Expected Result:**
- ✅ Alert: "Please select a PDF or image file..."
- ✅ No badge shown

### Test 4b: Oversized File
1. Try to upload a file >5MB

**Expected Result:**
- ✅ Alert: "File size exceeds 5MB limit..."
- ✅ No badge shown

**Status:** ___________

---

## Test 5: Remove Attachment

**Goal:** Test file removal before sending

### Steps:
1. Attach a PDF file (badge appears)
2. Click the [×] button on the badge

### Expected Results:
- ✅ Badge disappears
- ✅ Console log: `"📎 Attachment cleared"`
- ✅ Can attach a new file

**Status:** ___________

---

## Test 6: Send Message Without File

**Goal:** Test text-only message (existing functionality)

### Steps:
1. Type: "Hello, can you help me?"
2. Click send button (paper plane icon)

### Expected Results:
- ✅ Message appears in chat as user bubble
- ✅ WebSocket sends message
- ✅ Console log: `"💬 Chat message sent via WebSocket"`
- ✅ Backend receives message (check MCP server logs)

**Check Backend:**
```bash
# Should see in MCP server logs:
INFO: Processing chat message: Hello, can you help me?... (file: none)
```

**Status:** ___________

---

## Test 7: Send Message WITH File (Full Integration)

**Goal:** Test complete file upload → LLM processing workflow

### Prerequisites:
- ✅ `ANTHROPIC_API_KEY` environment variable set
- ✅ Test PDF file ready (e.g., a simple math worksheet)

### Steps:
1. Attach a PDF file (badge appears)
2. Type: "Extract educational components from this PDF"
3. Click send button

### Expected Results (Frontend):
- ✅ User bubble shows: `"Extract educational components... [📎 filename.pdf]"`
- ✅ Badge disappears after send
- ✅ Input clears
- ✅ Console logs:
  - `"📎 Sending message with file: filename.pdf"`
  - `"💬 Chat message sent via WebSocket"`

### Expected Results (Backend):
**MCP Server Logs:**
```
INFO: Processing chat message: Extract educational components... (file: filename.pdf)
INFO: Processing file: filename.pdf (XXXXX bytes)
```

**Claude Response:**
- ✅ AI bubble appears with response
- ✅ Example: "✓ Added 7 components to N002"
- ✅ OR: Detailed description of PDF content

**Editor (if components added):**
- ✅ Component list refreshes
- ✅ New components visible in editor
- ✅ Can click on components to edit

**Status:** ___________

---

## Test 8: Error Handling

**Goal:** Test graceful error handling

### Test 8a: No API Key
1. Unset `ANTHROPIC_API_KEY`
2. Send message with file

**Expected Result:**
- ✅ Error message in chat: "Error processing message: ..."
- ✅ No crash

### Test 8b: Invalid File Data
1. Open browser console
2. Manually send malformed WebSocket message

**Expected Result:**
- ✅ Backend logs error
- ✅ Error message sent to chat
- ✅ No crash

**Status:** ___________

---

## Test 9: Multiple File Uploads (Sequential)

**Goal:** Test sending multiple files one after another

### Steps:
1. Send file #1 with message: "Extract from this"
2. Wait for response
3. Send file #2 with message: "Now extract from this one"

### Expected Results:
- ✅ File #1 processed successfully
- ✅ File #2 processed successfully
- ✅ Each file handled independently
- ✅ No state leak between uploads

**Status:** ___________

---

## Test 10: WebSocket Reconnection

**Goal:** Test automatic reconnection

### Steps:
1. Open chat (WebSocket connects)
2. Stop MCP server: `kill $(lsof -ti:8001)`
3. Wait 5 seconds
4. Restart MCP server: `cd mcp-management && python3 mcp_server.py`

### Expected Results:
- ✅ Connection status dot turns red (disconnected)
- ✅ Automatic reconnection attempts
- ✅ Connection status dot turns green (connected)
- ✅ Messages work again after reconnection

**Status:** ___________

---

## Test 11: Real Educational PDF

**Goal:** Test with actual educational content

### Prerequisites:
- Find a math PDF with diagrams, problems, and text

### Steps:
1. Drag the educational PDF into chat
2. Type: "Extract all educational components suitable for grade 6"
3. Send

### Expected Results:
- ✅ Claude analyzes PDF content
- ✅ Intelligent component selection:
  - Headings for titles
  - Paragraphs for explanations
  - Worked-example for problem solutions
  - Hero-number for fraction diagrams
  - Step-sequence for multi-step instructions
- ✅ Components appear in editor
- ✅ Preview shows formatted content

### Quality Checks:
- [ ] Component types make sense
- [ ] Text extracted accurately
- [ ] Parameters filled correctly
- [ ] No duplicate components

**Status:** ___________

---

## Test 12: Conversational Iteration

**Goal:** Test editing components via chat

### Steps:
1. Send PDF, get components extracted
2. Type: "Change component #3 to a callout box"
3. Send

### Expected Results:
- ✅ LLM calls `edit_component` tool
- ✅ Component #3 updated
- ✅ Editor refreshes
- ✅ Chat confirms: "✓ Updated paragraph component..."

**Status:** ___________

---

## Debugging Checklist

If something doesn't work:

### Frontend Issues:
- [ ] Check browser console for errors
- [ ] Verify `websocket-chat.js` loaded (no 404)
- [ ] Check WebSocket connection status (green dot)
- [ ] Verify CSS styles applied (inspect element)

### Backend Issues:
- [ ] Check MCP server logs: `tail -f mcp-management/logs`
- [ ] Verify `ANTHROPIC_API_KEY` is set: `echo $ANTHROPIC_API_KEY`
- [ ] Check FastAPI is running: `curl http://localhost:8000/health`
- [ ] Check MCP server is running: `curl http://localhost:8001/health`

### WebSocket Issues:
- [ ] Verify port 8001 is open: `lsof -i :8001`
- [ ] Check browser WebSocket errors (Network tab)
- [ ] Verify CORS headers (should allow all origins)

### LLM Issues:
- [ ] Check API key validity
- [ ] Check API rate limits (Anthropic dashboard)
- [ ] Verify file size <5MB
- [ ] Check Claude API status: https://status.anthropic.com

---

## Success Criteria Summary

**All Tests Passing:**
- ✅ UI elements display correctly
- ✅ File upload works (click + drag-drop)
- ✅ File validation works (type + size)
- ✅ Badge preview works
- ✅ Remove attachment works
- ✅ Text-only messages work
- ✅ File messages process correctly
- ✅ LLM extracts components intelligently
- ✅ Editor refreshes with new components
- ✅ Error handling graceful
- ✅ Conversational iteration works

**System Status: PRODUCTION READY 🚀**

---

## Common Issues & Solutions

### Issue 1: Paperclip Button Not Appearing
**Cause:** CSS not loaded or specificity issue
**Solution:**
```bash
# Clear browser cache
# Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
```

### Issue 2: File Badge Not Showing After Drop
**Cause:** File validation failed (wrong type or too large)
**Solution:** Check console for error logs, verify file is PDF/image <5MB

### Issue 3: "Error processing message" in Chat
**Cause:** Missing API key or LLM backend issue
**Solution:**
```bash
# Check API key is set
echo $ANTHROPIC_API_KEY

# Restart MCP server
cd mcp-management
python3 mcp_server.py
```

### Issue 4: WebSocket Not Connecting
**Cause:** MCP server not running or port blocked
**Solution:**
```bash
# Check if MCP server is running
lsof -i :8001

# If not running, start it
cd mcp-management
python3 mcp_server.py
```

### Issue 5: Components Not Appearing in Editor
**Cause:** Tool execution failed or UI didn't refresh
**Solution:**
- Check MCP server logs for tool execution errors
- Manually refresh editor (select different node, then back)
- Check if `batch_add_components` tool is in tool list: `POST /mcp/tools/list`

---

## Performance Benchmarks

**Expected Timing:**
- File selection: Instant
- Badge display: <50ms
- Base64 encoding: 50-100ms (typical PDF)
- WebSocket send: <10ms
- LLM processing: 2-3 seconds (Claude API)
- Tool execution: ~500ms
- Editor refresh: <200ms

**Total End-to-End:** ~3-5 seconds from send to display

**If Slower:**
- Check network latency (browser DevTools → Network tab)
- Check Claude API response time (backend logs)
- Verify database transaction time (should be <500ms)

---

## Next Steps After Testing

1. **If All Tests Pass:**
   - Deploy to production environment
   - Monitor usage and performance
   - Gather user feedback

2. **If Issues Found:**
   - Check "Debugging Checklist" above
   - Review backend logs: `mcp-management/logs`
   - Review browser console errors
   - Verify environment variables

3. **Production Deployment:**
   - Set up reverse proxy (nginx/Apache)
   - Configure SSL certificates (HTTPS)
   - Set production API keys
   - Enable logging and monitoring
   - Set up rate limiting (if needed)

---

**Happy Testing! 🎉**
