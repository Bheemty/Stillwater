export function filmRect(width,height){
 if(width<700||width/height<1.05)return {x:0,y:Math.round(height*.32),width,height:width*9/16};
 const wide=width/height>16/9,w=wide?width:height*16/9,h=wide?width*9/16:height;
 return {x:(width-w)/2,y:(height-h)/2,width:w,height:h};
}
