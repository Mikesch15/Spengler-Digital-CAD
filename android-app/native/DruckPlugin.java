package ch.spenglerdigital.cad;

import android.content.Context;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.webkit.WebView;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** Drucken aus der Web-Oberfläche: window.print() fehlt im Android-WebView, daher übernimmt das der Android-Druckdienst (auch «Als PDF speichern»). */
@CapacitorPlugin(name = "Druck")
public class DruckPlugin extends Plugin {
    @PluginMethod
    public void drucken(final PluginCall call) {
        final String name = call.getString("name", "Spengler Digital CAD");
        getActivity().runOnUiThread(new Runnable() {
            @Override
            public void run() {
                try {
                    WebView web = getBridge().getWebView();
                    PrintManager pm = (PrintManager) getActivity().getSystemService(Context.PRINT_SERVICE);
                    PrintDocumentAdapter adapter = web.createPrintDocumentAdapter(name);
                    pm.print(name, adapter, new PrintAttributes.Builder().build());
                    call.resolve();
                } catch (Exception e) {
                    call.reject(String.valueOf(e.getMessage()));
                }
            }
        });
    }
}
