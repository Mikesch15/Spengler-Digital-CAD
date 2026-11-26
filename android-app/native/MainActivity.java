package ch.spenglerdigital.cad;

import android.os.Bundle;
import android.view.MotionEvent;
import android.view.View;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(DruckPlugin.class);
        super.onCreate(savedInstanceState);
        // Stift-Schweben (Hover): manche Geräte melden es nur als Android-Hover-Ereignis und nicht als Pointer-Ereignis der Webseite.
        // Es wird an die Seite weitergereicht (window.sdcadHover); das Ereignis selbst wird nicht verbraucht.
        final WebView web = getBridge().getWebView();
        final float dichte = getResources().getDisplayMetrics().density;
        web.setOnGenericMotionListener(new View.OnGenericMotionListener() {
            @Override
            public boolean onGenericMotion(View v, MotionEvent ev) {
                int a = ev.getActionMasked();
                if ((a == MotionEvent.ACTION_HOVER_MOVE || a == MotionEvent.ACTION_HOVER_ENTER || a == MotionEvent.ACTION_HOVER_EXIT)
                        && ev.getPointerCount() > 0 && ev.getToolType(0) == MotionEvent.TOOL_TYPE_STYLUS) {
                    final String js = "window.sdcadHover&&window.sdcadHover(" + (ev.getX() / dichte) + "," + (ev.getY() / dichte) + ",\""
                            + (a == MotionEvent.ACTION_HOVER_EXIT ? "exit" : "move") + "\")";
                    web.post(new Runnable() { @Override public void run() { web.evaluateJavascript(js, null); } });
                }
                return false;
            }
        });
    }
}
