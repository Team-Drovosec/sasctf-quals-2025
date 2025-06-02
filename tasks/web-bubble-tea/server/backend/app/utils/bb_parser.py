import re
import html
from flask import current_app

class BBCodeParser:
    
    def __init__(self, allowed_tags=None):
        self.allowed_tags = allowed_tags or current_app.config.get('ALLOWED_BB_TAGS', [
            'b', 'i', 's', 'h1', 'list', 'quote', 'code', 
            'url', 'img', 'youtube', 'yt'
        ])
        self.tag_handlers = {
            'b': self._handle_bold,
            'i': self._handle_italic,
            's': self._handle_strike,
            'h1': self._handle_h1,
            'list': self._handle_list,
            '*': self._handle_list_item,
            'quote': self._handle_quote,
            'code': self._handle_code,
            'url': self._handle_url,
            'img': self._handle_image,
            'youtube': self._handle_youtube,
            'yt': self._handle_youtube
        }
    
    def parse(self, text):
        if not text:
            return ""

        escaped_text = html.escape(text)
        
        result = escaped_text
        for tag in self.allowed_tags:
            if tag in self.tag_handlers:
                result = self.tag_handlers[tag](result)
        
        return result
    
    def _handle_bold(self, text):
        pattern = r'\[b\](.*?)\[/b\]'
        return re.sub(pattern, r'<strong>\1</strong>', text)
    
    def _handle_italic(self, text):
        pattern = r'\[i\](.*?)\[/i\]'
        return re.sub(pattern, r'<em>\1</em>', text)
    
    def _handle_strike(self, text):
        pattern = r'\[s\](.*?)\[/s\]'
        return re.sub(pattern, r'<strike>\1</strike>', text)
    
    def _handle_h1(self, text):
        pattern = r'\[h1\](.*?)\[/h1\]'
        return re.sub(pattern, r'<h1>\1</h1>', text)
    
    def _handle_list(self, text):
        pattern = r'\[list\](.*?)\[/list\]'
        return re.sub(pattern, r'<ul>\1</ul>', text, flags=re.DOTALL)
    
    def _handle_list_item(self, text):
        pattern = r'\[\*\](.*?)(?=\[\*\]|\[/list\]|$)'
        return re.sub(pattern, r'<li>\1</li>', text, flags=re.DOTALL)
    
    def _handle_quote(self, text):
        simple_pattern = r'\[quote\](.*?)\[/quote\]'
        text = re.sub(simple_pattern, r'<blockquote>\1</blockquote>', text, flags=re.DOTALL)
        
        author_pattern = r'\[quote=([^\]]+)\](.*?)\[/quote\]'
        text = re.sub(author_pattern, r'<blockquote><cite>\1 wrote:</cite>\2</blockquote>', text, flags=re.DOTALL)
        
        return text
    
    def _handle_code(self, text):
        pattern = r'\[code\](.*?)\[/code\]'
        return re.sub(pattern, r'<code>\1</code>', text, flags=re.DOTALL)
    
    def _handle_url(self, text):
        simple_pattern = r'\[url\](https?://[^"\'\[\]<>]+?)\[/url\]'
        text = re.sub(simple_pattern, r'<a href="\1">\1</a>', text)
        
        complex_pattern = r'\[url=([^"\'\[\]<>]+?)\](.*?)\[/url\]'
        
        def url_replacer(match):
            url = match.group(1)
            label = match.group(2)
            
            if not url.startswith(('http://', 'https://')):
                url = 'http://' + url
                
            return f'<a href="{url}">{label}</a>'
        
        text = re.sub(complex_pattern, url_replacer, text)
        
        return text
    
    def _handle_image(self, text):
        simple_pattern = r'\[img\](https?://[^"\'\[\]<>]+?\.(?:jpg|jpeg|png|gif))\[/img\]'
        text = re.sub(simple_pattern, 
                      r'<img src="\1" alt="User posted image" style="max-width:100%;">', 
                      text)

        dim_pattern = r'\[img=(\d+),(\d+)\](https?://[^"\'\[\]<>]+?\.(?:jpg|jpeg|png|gif))\[/img\]'
        text = re.sub(dim_pattern, 
                      r'<img src="\3" width="\1" height="\2" alt="User posted image" style="max-width:100%;">', 
                      text)

        attr_pattern = r'\[img ([^\]]+)\](https?://[^"\'\[\]<>]+?\.(?:jpg|jpeg|png|gif))\[/img\]'
        
        def img_attr_replacer(match):
            attrs_str = match.group(1)
            img_url = match.group(2)
            return f'<img src="{img_url}" {attrs_str} style="max-width:100%;">'
            
        text = re.sub(attr_pattern, img_attr_replacer, text)
        
        return text
    
    def _handle_youtube(self, text):
        youtube_pattern = r'\[(youtube|yt)(.*?)\]'
        
        def youtube_replacer(match):
            attrs_str = match.group(2)
            
            attrs = {}
            for attr_match in re.finditer(r'([a-zA-Z0-9_\-]+)=(["\'])(.*?)\2', attrs_str):
                attr_name = attr_match.group(1)
                attr_value = attr_match.group(3)
                # Only allow id, width, height
                if attr_name in ['id', 'width', 'height']:
                    attrs[attr_name] = attr_value
            
            width = attrs.get('width', '560')
            height = attrs.get('height', '315')
            youtube_id = attrs.get('id', 'undefined')
            
            # Always construct the src URL from the ID
            return (f'<iframe width="{width}" height="{height}" '
                  f'src="https://www.youtube.com/embed/{youtube_id}" '
                  f'frameborder="0" allowfullscreen></iframe>')
        
        return re.sub(youtube_pattern, youtube_replacer, text)
